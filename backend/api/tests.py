from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from api.models import KYCSubmission
from api.services.state_machine import KYCState, validate_transition
from rest_framework.exceptions import ValidationError

User = get_user_model()

class StateMachineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.reviewer = User.objects.create_user(username='reviewer_user', password='password123', role=User.ROLE_REVIEWER)
        self.merchant = User.objects.create_user(username='merchant_user', password='password123', role=User.ROLE_MERCHANT)
        self.other_merchant = User.objects.create_user(username='other_merchant', password='password123', role=User.ROLE_MERCHANT)
        
        # Pre-seed a submission in an APPROVED state
        self.submission = KYCSubmission.objects.create(
            user=self.merchant,
            status=KYCState.APPROVED
        )

    def test_invalid_transition_approved_to_draft_gives_400(self):
        # We can test if we approve an already approved state. Or an endpoint that tries to request more info on approved.
        self.client.force_authenticate(user=self.reviewer)
        url = reverse('kyc-action', kwargs={'pk': self.submission.pk, 'action': 'request-more-info'})
        
        response = self.client.post(url, {})
        
        # Expect 400 Bad Request
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid state transition", response.data['error'])
        
        # Also directly test the state_machine function just in case
        with self.assertRaises(ValidationError) as context:
            validate_transition(KYCState.APPROVED, KYCState.DRAFT)
            
        self.assertIn("Invalid state transition from approved to draft", str(context.exception))

    def test_merchant_accessing_other_merchants_submission_gives_403(self):
        self.client.force_authenticate(user=self.other_merchant)
        url = reverse('kyc-detail', kwargs={'pk': self.submission.pk})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], 'Forbidden')
    
    def test_reviewer_can_access_any_submission(self):
        self.client.force_authenticate(user=self.reviewer)
        url = reverse('kyc-detail', kwargs={'pk': self.submission.pk})

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], KYCState.APPROVED)
