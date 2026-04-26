from rest_framework.exceptions import ValidationError

class KYCState:
    DRAFT = 'draft'
    SUBMITTED = 'submitted'
    UNDER_REVIEW = 'under_review'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    MORE_INFO_REQUESTED = 'more_info_requested'

    CHOICES = [
        (DRAFT, 'Draft'),
        (SUBMITTED, 'Submitted'),
        (UNDER_REVIEW, 'Under Review'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
        (MORE_INFO_REQUESTED, 'More Info Requested'),
    ]

VALID_TRANSITIONS = {
    KYCState.DRAFT: [KYCState.SUBMITTED],
    KYCState.SUBMITTED: [KYCState.UNDER_REVIEW],
    KYCState.UNDER_REVIEW: [
        KYCState.APPROVED,
        KYCState.REJECTED,
        KYCState.MORE_INFO_REQUESTED
    ],
    KYCState.MORE_INFO_REQUESTED: [KYCState.SUBMITTED],
    KYCState.APPROVED: [],
    KYCState.REJECTED: [],
}

def validate_transition(current_state, new_state):
    """
    Validates if the transition from current_state to new_state is allowed.
    Raises ValidationError if invalid.
    """
    if current_state == new_state:
        raise ValidationError("Submission already in this state")
        
    allowed_states = VALID_TRANSITIONS.get(current_state, [])
    if new_state not in allowed_states:
        raise ValidationError(f"Invalid state transition from {current_state} to {new_state}")
    return True

def update_kyc_status(submission, new_state, rejection_reason=None):
    from api.models import Notification
    
    validate_transition(submission.status, new_state)
    
    submission.status = new_state
    if rejection_reason and new_state == KYCState.REJECTED:
        submission.rejection_reason = rejection_reason
        
    submission.save()
    
    Notification.objects.create(
        merchant=submission.user,
        event_type=new_state.upper(),
        payload={
            'submission_id': submission.id,
            'new_state': new_state,
            'message': f'Your KYC status changed to {new_state}.'
        }
    )
    return submission
