from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models import KYCSubmission, Document, Notification

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'type', 'file', 'created_at']

class KYCSubmissionSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = KYCSubmission
        fields = ['id', 'user', 'personal_details', 'business_details', 'status', 'rejection_reason', 'created_at', 'updated_at', 'documents']
        read_only_fields = ['status', 'rejection_reason', 'created_at', 'updated_at']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'event_type', 'payload', 'created_at']
