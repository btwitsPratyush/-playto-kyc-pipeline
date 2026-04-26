import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trustlayer.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import KYCSubmission
from api.services.state_machine import KYCState

User = get_user_model()

def seed():
    # Create reviewer
    if not User.objects.filter(username='reviewer_1').exists():
        User.objects.create_user(username='reviewer_1', password='password', role=User.ROLE_REVIEWER)
        print("Created reviewer: reviewer_1")

    # Create merchants
    merchant_1, created_1 = User.objects.get_or_create(username='merchant_1', defaults={'role': User.ROLE_MERCHANT, 'password': 'password'})
    if created_1:
        merchant_1.set_password('password')
        merchant_1.save()
        KYCSubmission.objects.create(
            user=merchant_1,
            status=KYCState.UNDER_REVIEW,
            personal_details={"name": "Alice Assessment", "phone": "1234567890"},
            business_details={"company_name": "Assessment LLC"}
        )
        print("Created merchant: merchant_1 (UNDER_REVIEW)")

if __name__ == '__main__':
    seed()
    print("Seed complete.")
