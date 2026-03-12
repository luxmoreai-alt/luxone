from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema

from .serializers import (
    CheckEmailSerializer, LoginSerializer, SendOTPSerializer,
    VerifyOTPSerializer, ResetPasswordSerializer
)
from .models import OTP
from .services import generate_and_send_otp
from .utils import custom_response
from crm_backend.middleware import set_current_db_name
from saas_admin.models import Company
from saas_admin.services import configure_tenant_database_in_settings

User = get_user_model()

def get_tenant_user_for_email(email, require_admin=True):
    """
    Finds the tenant database and user record for an email.
    Re-registers tenant DBs in settings so login still works after server restarts.
    """
    for company in Company.objects.filter(status='Active'):
        try:
            configure_tenant_database_in_settings(company.db_name)
            queryset = User.objects.using(company.db_name).filter(
                email=email,
                is_active=True,
            )
            if require_admin:
                queryset = queryset.filter(is_admin=True)

            user = queryset.first()
            if user:
                return company.db_name, user
        except Exception:
            continue
    return None, None

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
    }


def build_auth_payload(user, db_name):
    tokens = get_tokens_for_user(user)
    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "tenant_db": db_name,
        "user": {
            "id": user.pk,
            "email": user.email,
            "is_admin": getattr(user, "is_admin", False),
        },
    }

class CheckEmailView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=CheckEmailSerializer)
    def post(self, request):
        serializer = CheckEmailSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            db_name, user = get_tenant_user_for_email(email, require_admin=False)

            if db_name and user:
                set_current_db_name(db_name)
                return Response(custom_response(success=True, message="Email found"), status=status.HTTP_200_OK)
            return Response(custom_response(success=False, message="Admin not registered or company inactive"), status=status.HTTP_404_NOT_FOUND)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=LoginSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            db_name, tenant_user = get_tenant_user_for_email(email, require_admin=False)
            if not db_name or not tenant_user:
                return Response(custom_response(success=False, message="Invalid login context"), status=status.HTTP_401_UNAUTHORIZED)

            set_current_db_name(db_name)
            user = authenticate(email=email, password=password)
            if user and user.is_active:
                data = build_auth_payload(user, db_name)
                return Response(custom_response(success=True, message="Login successful", data=data), status=status.HTTP_200_OK)
            return Response(custom_response(success=False, message="Invalid password or deactivated"), status=status.HTTP_401_UNAUTHORIZED)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class SendOTPView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=SendOTPSerializer)
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            db_name, user = get_tenant_user_for_email(email, require_admin=False)

            if db_name and user:
                set_current_db_name(db_name)
                if generate_and_send_otp(email):
                    return Response(custom_response(success=True, message="OTP sent successfully to " + email), status=status.HTTP_200_OK)
                return Response(custom_response(success=False, message="Failed to send OTP"), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response(custom_response(success=False, message="Admin not registered"), status=status.HTTP_404_NOT_FOUND)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=VerifyOTPSerializer)
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            code = serializer.validated_data['otp']

            db_name, user = get_tenant_user_for_email(email, require_admin=False)
            if not db_name or not user:
                return Response(custom_response(success=False, message="Admin not registered"), status=status.HTTP_404_NOT_FOUND)

            set_current_db_name(db_name)
            otp_record = OTP.objects.filter(email=email, code=code, is_verified=False).order_by('-created_at').first()
            
            if otp_record and otp_record.is_valid():
                otp_record.is_verified = True
                otp_record.save()

                data = build_auth_payload(user, db_name)
                return Response(custom_response(success=True, message="Login successful", data=data), status=status.HTTP_200_OK)
            return Response(custom_response(success=False, message="Invalid or expired OTP"), status=status.HTTP_401_UNAUTHORIZED)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=SendOTPSerializer)
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            db_name, user = get_tenant_user_for_email(email, require_admin=False)
            if db_name and user:
                set_current_db_name(db_name)
                if generate_and_send_otp(email):
                    return Response(custom_response(success=True, message="OTP sent successfully"), status=status.HTTP_200_OK)
                return Response(custom_response(success=False, message="Failed to send OTP"), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response(custom_response(success=False, message="Admin not registered"), status=status.HTTP_404_NOT_FOUND)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=ResetPasswordSerializer)
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            code = serializer.validated_data['otp']
            new_password = serializer.validated_data['new_password']

            db_name, user = get_tenant_user_for_email(email, require_admin=False)
            if not db_name or not user:
                return Response(custom_response(success=False, message="Admin not registered"), status=status.HTTP_404_NOT_FOUND)

            set_current_db_name(db_name)
            otp_record = OTP.objects.filter(email=email, code=code, is_verified=False).order_by('-created_at').first()
            
            if otp_record and otp_record.is_valid():
                user.set_password(new_password)
                user.save()
                otp_record.is_verified = True
                otp_record.save()
                return Response(custom_response(success=True, message="Password reset successfully"), status=status.HTTP_200_OK)
            return Response(custom_response(success=False, message="Invalid or expired OTP"), status=status.HTTP_401_UNAUTHORIZED)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)
