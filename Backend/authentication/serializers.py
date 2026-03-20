from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


# ── Auth flow serializers (unchanged) ─────────────────────────────────────────

class CheckEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)


# ── User management serializers ────────────────────────────────────────────────

class UserDetailSerializer(serializers.ModelSerializer):
    """Read-only serializer — used for list / retrieve."""
    manager_email = serializers.SerializerMethodField()
    organization_name = serializers.SerializerMethodField()
    team_label = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "role",
            "team",
            "team_label",
            "is_active",
            "manager",
            "manager_email",
            "organization",
            "organization_name",
            "created_at",
        ]
        read_only_fields = fields

    def get_manager_email(self, obj):
        return obj.manager.email if obj.manager else None

    def get_organization_name(self, obj):
        return obj.organization.name if obj.organization else None

    def get_team_label(self, obj):
        return obj.get_team_display() if hasattr(obj, "get_team_display") else None


class UserCreateSerializer(serializers.Serializer):
    """
    Used by admin/manager to create a new CRM user.

    Admin   → can set role to admin / manager / employee
    Manager → role is forced to 'employee', manager is auto-set to creator
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    role = serializers.ChoiceField(
        choices=User.Role.choices,
        default=User.Role.EMPLOYEE,
    )
    team = serializers.ChoiceField(
        choices=User.Team.choices,
        default=User.Team.GENERAL,
        required=False,
    )
    manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()


class UserUpdateSerializer(serializers.ModelSerializer):
    """Used by admin to update role, manager, or active status."""

    class Meta:
        model = User
        fields = ["role", "team", "manager", "is_active"]

    def validate_manager(self, value):
        if value and value == self.instance:
            raise serializers.ValidationError("A user cannot be their own manager.")
        return value


class SetPasswordSerializer(serializers.Serializer):
    """Admin can reset another user's password."""
    new_password = serializers.CharField(write_only=True, min_length=6)
