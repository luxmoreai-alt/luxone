from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema

from .serializers import (
    CheckEmailSerializer, LoginSerializer, SendOTPSerializer,
    VerifyOTPSerializer, ResetPasswordSerializer,
    UserCreateSerializer, UserDetailSerializer, UserUpdateSerializer,
    SetPasswordSerializer,
)
from .permissions import IsOrgAdmin, IsAdminOrManager
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
            "role": getattr(user, "role", "employee"),
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
                return Response(custom_response(
                    success=True,
                    message="Email found",
                    data={
                        "role": getattr(user, "role", "employee"),
                        "email": user.email,
                    }
                ), status=status.HTTP_200_OK)
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

            # Authenticate directly against the tenant database.
            # Django's authenticate() always queries the 'default' DB, which misses
            # manager/employee accounts stored only in tenant databases.
            try:
                user = User.objects.using(db_name).get(email__iexact=email, is_active=True)
            except User.DoesNotExist:
                return Response(custom_response(success=False, message="Invalid password or deactivated"), status=status.HTTP_401_UNAUTHORIZED)

            if not user.check_password(password):
                return Response(custom_response(success=False, message="Invalid password or deactivated"), status=status.HTTP_401_UNAUTHORIZED)

            data = build_auth_payload(user, db_name)
            return Response(custom_response(success=True, message="Login successful", data=data), status=status.HTTP_200_OK)
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

class UserListView(APIView):
    """Legacy endpoint — kept for backwards compatibility."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(is_active=True).values("id", "email")
        return Response(list(users), status=status.HTTP_200_OK)


# ── User Management ViewSet ────────────────────────────────────────────────────

class UserManagementViewSet(viewsets.ViewSet):
    """
    Full user management for admin/manager.

    Endpoints:
      GET    /api/auth/manage-users/           list users (role-scoped)
      POST   /api/auth/manage-users/           create user
      GET    /api/auth/manage-users/{id}/      user detail
      PATCH  /api/auth/manage-users/{id}/      update role / manager / active (admin only)
      DELETE /api/auth/manage-users/{id}/      deactivate user (admin only)
      POST   /api/auth/manage-users/{id}/set-password/  reset password (admin only)
      GET    /api/auth/manage-users/me/        current user profile
    """
    permission_classes = [IsAuthenticated, IsAdminOrManager]

    def _scoped_queryset(self, user):
        """Returns users visible to the requesting user."""
        from organizations.services import get_team_members

        org_id = getattr(user, "organization_id", None)
        if not org_id:
            return User.objects.filter(is_active=True)

        role = getattr(user, "role", "employee")
        base = User.objects.filter(organization_id=org_id).select_related("manager", "organization")

        if role == "admin":
            return base
        if role == "manager":
            team_ids = list(get_team_members(user).values_list("id", flat=True))
            team_ids.append(user.pk)
            return base.filter(pk__in=team_ids)
        return base.filter(pk=user.pk)

    # ── GET /manage-users/ ────────────────────────────────────────────────
    def list(self, request):
        qs = self._scoped_queryset(request.user)
        serializer = UserDetailSerializer(qs, many=True)
        return Response(serializer.data)

    # ── POST /manage-users/ ───────────────────────────────────────────────
    def create(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        creator = request.user
        creator_role = getattr(creator, "role", "employee")

        # Determine role
        requested_role = data.get("role", User.Role.EMPLOYEE)
        if creator_role == "manager":
            # Managers can only create employees assigned to themselves
            assigned_role = User.Role.EMPLOYEE
            manager_for_new_user = creator
        else:
            # Admin — can set any role
            assigned_role = requested_role
            manager_for_new_user = data.get("manager", None)

        # Validate: admin cannot be created by a manager
        if creator_role == "manager" and requested_role in ("admin", "manager"):
            return Response(
                {"detail": "Managers can only create employee accounts."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Create the user
        new_user = User.objects.create_user(
            email=data["email"],
            password=data["password"],
        )
        new_user.role = assigned_role
        new_user.organization = creator.organization
        new_user.manager = manager_for_new_user
        new_user.is_active = True
        new_user.save()

        return Response(
            UserDetailSerializer(new_user).data,
            status=status.HTTP_201_CREATED,
        )

    # ── GET /manage-users/{id}/ ───────────────────────────────────────────
    def retrieve(self, request, pk=None):
        qs = self._scoped_queryset(request.user)
        user = qs.filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserDetailSerializer(user).data)

    # ── PATCH /manage-users/{id}/ ─────────────────────────────────────────
    def partial_update(self, request, pk=None):
        if getattr(request.user, "role", None) != "admin":
            return Response(
                {"detail": "Only admins can update user details."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = self._scoped_queryset(request.user)
        user = qs.filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserDetailSerializer(user).data)

    # ── DELETE /manage-users/{id}/ ────────────────────────────────────────
    def destroy(self, request, pk=None):
        if getattr(request.user, "role", None) != "admin":
            return Response(
                {"detail": "Only admins can deactivate users."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if str(request.user.pk) == str(pk):
            return Response(
                {"detail": "You cannot deactivate your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = self._scoped_queryset(request.user)
        user = qs.filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response({"detail": f"User {user.email} has been deactivated."})

    # ── POST /manage-users/{id}/set-password/ ────────────────────────────
    @action(detail=True, methods=["post"], url_path="set-password",
            permission_classes=[IsAuthenticated, IsOrgAdmin])
    def set_password(self, request, pk=None):
        qs = self._scoped_queryset(request.user)
        user = qs.filter(pk=pk).first()
        if not user:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": f"Password updated for {user.email}."})

    # ── GET /manage-users/me/ ─────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="me",
            permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserDetailSerializer(request.user).data)


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
