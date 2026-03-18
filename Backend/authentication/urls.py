from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CheckEmailView, LoginView, SendOTPView,
    VerifyOTPView, ForgotPasswordView, ResetPasswordView,
    UserListView, UserManagementViewSet,
)

router = DefaultRouter()
router.register(r"manage-users", UserManagementViewSet, basename="manage-users")

urlpatterns = [
    path('check-email', CheckEmailView.as_view(), name='check-email'),
    path('login', LoginView.as_view(), name='login'),
    path('send-otp', SendOTPView.as_view(), name='send-otp'),
    path('verify-otp', VerifyOTPView.as_view(), name='verify-otp'),
    path('forgot-password', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password', ResetPasswordView.as_view(), name='reset-password'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('users', UserListView.as_view(), name='user-list'),   # legacy
    path('', include(router.urls)),
]
