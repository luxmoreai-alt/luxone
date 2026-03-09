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

User = get_user_model()

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
    }

class CheckEmailView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=CheckEmailSerializer)
    def post(self, request):
        serializer = CheckEmailSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email=email, is_admin=True, is_active=True).first()
            if user:
                return Response(custom_response(success=True, message="Email found"), status=status.HTTP_200_OK)
            return Response(custom_response(success=False, message="Admin not registered"), status=status.HTTP_404_NOT_FOUND)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=LoginSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']

            user = authenticate(email=email, password=password)
            if user and user.is_admin and user.is_active:
                tokens = get_tokens_for_user(user)
                data = {
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens["refresh_token"],
                    "user": {
                        "email": user.email
                    }
                }
                return Response(custom_response(success=True, message="Login successful", data=data), status=status.HTTP_200_OK)
            return Response(custom_response(success=False, message="Invalid password"), status=status.HTTP_401_UNAUTHORIZED)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)

class SendOTPView(APIView):
    permission_classes = [AllowAny]

    @swagger_auto_schema(request_body=SendOTPSerializer)
    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            user = User.objects.filter(email=email, is_admin=True, is_active=True).first()
            if user:
                if generate_and_send_otp(email):
                    return Response(custom_response(success=True, message="OTP sent successfully"), status=status.HTTP_200_OK)
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

            user = User.objects.filter(email=email, is_admin=True, is_active=True).first()
            if not user:
                return Response(custom_response(success=False, message="Admin not registered"), status=status.HTTP_404_NOT_FOUND)

            otp_record = OTP.objects.filter(email=email, code=code, is_verified=False).order_by('-created_at').first()
            
            if otp_record and otp_record.is_valid():
                otp_record.is_verified = True
                otp_record.save()
                
                tokens = get_tokens_for_user(user)
                data = {
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens["refresh_token"],
                    "user": {
                        "email": user.email
                    }
                }
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
            user = User.objects.filter(email=email, is_admin=True, is_active=True).first()
            if user:
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

            user = User.objects.filter(email=email, is_admin=True, is_active=True).first()
            if not user:
                return Response(custom_response(success=False, message="Admin not registered"), status=status.HTTP_404_NOT_FOUND)

            otp_record = OTP.objects.filter(email=email, code=code, is_verified=False).order_by('-created_at').first()
            
            if otp_record and otp_record.is_valid():
                user.set_password(new_password)
                user.save()
                otp_record.is_verified = True
                otp_record.save()
                return Response(custom_response(success=True, message="Password reset successfully"), status=status.HTTP_200_OK)
            return Response(custom_response(success=False, message="Invalid or expired OTP"), status=status.HTTP_401_UNAUTHORIZED)
        return Response(custom_response(success=False, message=serializer.errors), status=status.HTTP_400_BAD_REQUEST)
