from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CheckEmailView, LoginView, SendOTPView, 
    VerifyOTPView, ForgotPasswordView, ResetPasswordView
)

urlpatterns = [
    path('check-email', CheckEmailView.as_view(), name='check-email'),
    path('login', LoginView.as_view(), name='login'),
    path('send-otp', SendOTPView.as_view(), name='send-otp'),
    path('verify-otp', VerifyOTPView.as_view(), name='verify-otp'),
    path('forgot-password', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password', ResetPasswordView.as_view(), name='reset-password'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
]
