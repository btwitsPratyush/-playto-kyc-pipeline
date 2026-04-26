from django.urls import path
from api.views import (
    SignupView, LoginView, KYCSaveDraftView, KYCSubmitView, KYCMeView,
    ReviewerQueueView, KYCDetailView, ReviewerActionView
)

urlpatterns = [
    path('signup', SignupView.as_view(), name='signup'),
    path('login', LoginView.as_view(), name='login'),
    
    # Merchant endpoints
    path('kyc/save-draft', KYCSaveDraftView.as_view(), name='kyc-save-draft'),
    path('kyc/submit', KYCSubmitView.as_view(), name='kyc-submit'),
    path('kyc/me', KYCMeView.as_view(), name='kyc-me'),
    
    # Shared / Reviewer endpoints
    path('kyc/queue', ReviewerQueueView.as_view(), name='kyc-queue'),
    path('kyc/<int:pk>', KYCDetailView.as_view(), name='kyc-detail'),
    path('kyc/<int:pk>/<str:action>', ReviewerActionView.as_view(), name='kyc-action'),
]
