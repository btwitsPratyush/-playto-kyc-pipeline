# KYC Pipeline Architecture Explainer

## 1. The State Machine

```python
def validate_transition(current_state, new_state):
    if current_state == new_state:
        raise ValidationError("Submission already in this state")
        
    allowed_states = VALID_TRANSITIONS.get(current_state, [])
    if new_state not in allowed_states:
        raise ValidationError(f"Invalid state transition from {current_state} to {new_state}")
    return True

def update_kyc_status(submission, new_state, rejection_reason=None):
    validate_transition(submission.status, new_state)
    
    submission.status = new_state
    if rejection_reason and new_state == KYCState.REJECTED:
        submission.rejection_reason = rejection_reason
        
    submission.save()
    
    Notification.objects.create(
        merchant=submission.user,
        event_type=new_state.upper(),
        payload={'submission_id': submission.id, 'new_state': new_state}
    )
    return submission
```

**Why it's centralized:**  
If state transition logic hangs out in `views.py` controllers, developers will inevitably forget to validate a transition entirely when shipping a new endpoint. By centralizing it inside `services/state_machine.py` via `update_kyc_status()`, we strictly funnel all state operations through one unified contract. This guarantees notifications always fire identically and no route can bypass the transition map.

**How illegal transitions are prevented:**  
`validate_transition` aggressively asserts against the `VALID_TRANSITIONS` dictionary mapping. Any endpoint attempting to jump out of bounds (e.g. `approved -> draft`) natively triggers a DRF `ValidationError` exception, completely halting the database commit sequence and bouncing a 400 Bad Request to the caller.

---

## 2. File Upload Validation

```python
def validate_file_upload(file):
    allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
    content_type = getattr(file, 'content_type', '')
    
    if content_type and content_type not in allowed_types:
        raise ValidationError("Invalid file type or file too large")

    filesize = file.size
    limit_mb = 5
    if filesize > limit_mb * 1024 * 1024:
        raise ValidationError("Invalid file type or file too large")
```

**Why `file.content_type` instead of extension:**  
Standard `FileExtensionValidator` checks are trivial to defeat. Attackers can upload executing malware by spoofing static file extensions (e.g., `payload.exe.pdf`). Verifying the actual MIME type via `content_type` safely guards server storage by inspecting payload structure logic structurally against the web-server bytes. 

**Why size validation is important / 50MB behavior:**  
Disk space exhaustions (DDoS via storage) freeze servers aggressively. If a script forcefully POSTs a 50MB file, the validator natively intercepts the operation before allocating permanent storage, surfacing a strict `ValidationError` breaking the API sequence.

---

## 3. The Queue (Reviewer Dashboard)

```python
threshold = timezone.now() - timedelta(hours=24)
        
submissions = KYCSubmission.objects.filter(
    status__in=[KYCState.SUBMITTED, KYCState.UNDER_REVIEW]
).annotate(
    at_risk=Case(
        When(created_at__lt=threshold, then=Value(True)),
        default=Value(False),
        output_field=BooleanField()
    )
).order_by('created_at')
```

**Why dynamically computed SLA vs stored boolean:**  
Storing a boolean database field like `is_at_risk` introduces extreme drift. The field will rot instantly as time progresses, requiring an expensive, continuous asynchronous background cron-job to constantly mutate older rows natively. Annotating dynamically passes the mathematical offset calculation purely to the DBMS Engine memory at execution time precisely correctly.

**Why oldest-first ordering is critical:**  
The dashboard governs operational throughput. If ordered descending (newest first), aging tickets systematically get buried on page 4 causing chronic SLA violations. Ordering `created_at` ASC respects basic FIFO queuing rules.

---

## 4. Authentication & Authorization

```python
class KYCDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            submission = KYCSubmission.objects.get(pk=pk)
        except KYCSubmission.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == User.ROLE_MERCHANT and submission.user != request.user:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
```

**Why this check must exist at API level vs UI Layer:**  
Never trust the client UI. The frontend application can obfuscate navigation, but any user can open terminal and execute `curl GET /api/v1/kyc/2`. Without forcing strict tenant isolation logic inside `KYCDetailView`, direct API querying causes an open Insecure Direct Object Reference (IDOR) bypass.

**The Mechanics:**  
Merchants natively bounce with `403 Forbidden` if the `KYCSubmission` user allocation misses their matching JWT access token identity. A Reviewer implicitly bypasses this validation mapping and successfully fetches the object instance unconditionally.

---

## 5. AI Audit

**What the AI Suggested Initially:**
During early architecture planning, the AI scattered explicit transition logic loosely across all the separate View endpoints:

```python
# Initial AI Approach (Flawed)
class ReviewerActionView(APIView):
    def post(self, request, pk, action):
        submission = KYCSubmission.objects.get(pk=pk)
        validate_transition(submission.status, new_state)
        submission.status = new_state
        submission.save()
        Notification.objects.create(...)
```

**What was wrong:**
This completely decoupled the validation check from the actual database commit. It forced developers to manually instantiate `#save()` and `#Notification` creations independently in `KYCSaveDraftView`, `ReviewerActionView`, and `KYCDetailView`. Missing a notification log mechanically was inevitable.

**The Corrected Version:**
```python
# Correct Fix (Centralized wrapper)
# views.py
update_kyc_status(submission, new_state, rejection_reason=request.data.get('reason'))

# services/state_machine.py
def update_kyc_status(submission, new_state, rejection_reason=None):
    validate_transition(submission.status, new_state)
    submission.status = new_state
    submission.save()
    Notification.objects.create(...)
    return submission
```
