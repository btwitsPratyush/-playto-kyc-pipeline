from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from django.db.models import F, Case, When, Value, BooleanField, Q

from api.models import KYCSubmission, Document, Notification
from api.serializers import UserSerializer, KYCSubmissionSerializer, DocumentSerializer
from api.services.state_machine import KYCState, validate_transition, update_kyc_status
from rest_framework.exceptions import ValidationError

User = get_user_model()

class IsReviewer(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.ROLE_REVIEWER

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role', User.ROLE_MERCHANT)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'User already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password, role=role)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'role': user.role, 'user_id': user.id}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        from django.contrib.auth import authenticate
        user = authenticate(username=username, password=password)
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'role': user.role, 'user_id': user.id})
        return Response({'error': 'Invalid Credentials'}, status=status.HTTP_400_BAD_REQUEST)

class KYCSaveDraftView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != User.ROLE_MERCHANT:
            return Response({'error': 'Only merchants can save drafts'}, status=status.HTTP_403_FORBIDDEN)

        submission, created = KYCSubmission.objects.get_or_create(
            user=request.user,
            defaults={'status': KYCState.DRAFT}
        )
        
        if 'personal_details' in request.data:
            submission.personal_details = request.data['personal_details']
        if 'business_details' in request.data:
            submission.business_details = request.data['business_details']
        
        submission.save()
        
        # Handle file uploads
        files = request.FILES.getlist('documents')
        for f in files:
            doc_type = request.data.get('doc_type', 'bank_statement') 
            try:
                Document.objects.create(submission=submission, type=doc_type, file=f)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(KYCSubmissionSerializer(submission).data)

class KYCSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != User.ROLE_MERCHANT:
            return Response({'error': 'Only merchants can submit'}, status=status.HTTP_403_FORBIDDEN)

        try:
            submission = KYCSubmission.objects.get(user=request.user)
        except KYCSubmission.DoesNotExist:
            return Response({'error': 'No draft found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            update_kyc_status(submission, KYCState.SUBMITTED)
            return Response(KYCSubmissionSerializer(submission).data)
        except ValidationError as e:
            msg = e.detail[0] if isinstance(e.detail, list) else str(e.detail)
            return Response({'error': str(msg)}, status=status.HTTP_400_BAD_REQUEST)

class KYCMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.ROLE_MERCHANT:
            return Response({'error': 'Only merchants can access this'}, status=status.HTTP_403_FORBIDDEN)

        try:
            submission = KYCSubmission.objects.get(user=request.user)
            return Response(KYCSubmissionSerializer(submission).data)
        except KYCSubmission.DoesNotExist:
            return Response({'error': 'No submissions found'}, status=status.HTTP_404_NOT_FOUND)

class ReviewerQueueView(APIView):
    permission_classes = [IsReviewer]

    def get(self, request):
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

        data = KYCSubmissionSerializer(submissions, many=True).data
        
        # Merge SLA logic from serialization into data response payload
        for i, item in enumerate(submissions):
            data[i]['at_risk'] = item.at_risk

        total_in_queue = submissions.count()
        
        # avg_time_in_queue calculation
        total_seconds = sum([(timezone.now() - sub.created_at).total_seconds() for sub in submissions])
        avg_time = (total_seconds / total_in_queue) if total_in_queue > 0 else 0
        
        # approval rate last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_decisions = KYCSubmission.objects.filter(
            updated_at__gte=seven_days_ago, 
            status__in=[KYCState.APPROVED, KYCState.REJECTED]
        )
        total_decisions = recent_decisions.count()
        approved_count = recent_decisions.filter(status=KYCState.APPROVED).count()
        approval_rate = (approved_count / total_decisions * 100) if total_decisions > 0 else 0

        return Response({
            'queue': data,
            'metrics': {
                'total_in_queue': total_in_queue,
                'avg_time_in_queue': avg_time,
                'approval_rate_last_7_days': approval_rate
            }
        })

class KYCDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        threshold = timezone.now() - timedelta(hours=24)
        try:
            submission = KYCSubmission.objects.annotate(
                at_risk=Case(When(created_at__lt=threshold, then=Value(True)), default=Value(False), output_field=BooleanField())
            ).get(pk=pk)
        except KYCSubmission.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == User.ROLE_MERCHANT and submission.user != request.user:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        if request.user.role == User.ROLE_REVIEWER and submission.status == KYCState.SUBMITTED:
            try:
                update_kyc_status(submission, KYCState.UNDER_REVIEW)
            except ValidationError:
                pass

        data = KYCSubmissionSerializer(submission).data
        data['at_risk'] = getattr(submission, 'at_risk', False)
        return Response(data)

class ReviewerActionView(APIView):
    permission_classes = [IsReviewer]

    def post(self, request, pk, action):
        try:
            submission = KYCSubmission.objects.get(pk=pk)
        except KYCSubmission.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'approve':
            new_state = KYCState.APPROVED
        elif action == 'reject':
            new_state = KYCState.REJECTED
        elif action == 'request-more-info':
            new_state = KYCState.MORE_INFO_REQUESTED
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        if new_state in [KYCState.REJECTED, KYCState.MORE_INFO_REQUESTED]:
            if not request.data.get('reason'):
                return Response({'error': 'Reason is required for this action'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            update_kyc_status(submission, new_state, rejection_reason=request.data.get('reason'))
            return Response(KYCSubmissionSerializer(submission).data)
        except ValidationError as e:
            msg = e.detail[0] if isinstance(e.detail, list) else str(e.detail)
            return Response({'error': str(msg)}, status=status.HTTP_400_BAD_REQUEST)
