import os
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from api.services.state_machine import KYCState

def validate_file_upload(file):
    allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
    content_type = getattr(file, 'content_type', '')
    
    # In some custom storages or tests, content_type might not be populated gracefully
    if content_type and content_type not in allowed_types:
        raise ValidationError("Invalid file type or file too large")

    filesize = file.size
    limit_mb = 5
    if filesize > limit_mb * 1024 * 1024:
        raise ValidationError("Invalid file type or file too large")

class User(AbstractUser):
    ROLE_MERCHANT = 'merchant'
    ROLE_REVIEWER = 'reviewer'
    ROLE_CHOICES = [
        (ROLE_MERCHANT, 'Merchant'),
        (ROLE_REVIEWER, 'Reviewer'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MERCHANT)

class KYCSubmission(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='kyc_submissions')
    personal_details = models.JSONField(default=dict, blank=True)
    business_details = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=30, choices=KYCState.CHOICES, default=KYCState.DRAFT)
    rejection_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"KYC: {self.user.username} - {self.status}"

class Document(models.Model):
    DOC_TYPES = [
        ('PAN', 'PAN'),
        ('Aadhaar', 'Aadhaar'),
        ('bank_statement', 'Bank Statement'),
    ]
    submission = models.ForeignKey(KYCSubmission, on_delete=models.CASCADE, related_name='documents')
    type = models.CharField(max_length=30, choices=DOC_TYPES)
    file = models.FileField(
        upload_to='kyc_docs/', 
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png']),
            validate_file_upload
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} for {self.submission.user.username}"

class Notification(models.Model):
    merchant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    event_type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} for {self.merchant.username}"
