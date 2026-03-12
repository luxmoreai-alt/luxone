import re
from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import serializers

from activities.models import LeadActivity
from notes.models import LeadNote

from .models import Contact
from .permissions import can_access_contact_owner

PHONE_PATTERN = re.compile(r"^\+?[0-9\-().\s]{7,20}$")
User = get_user_model()


class ContactOwnerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()


class ContactAccountSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class ContactLeadReferenceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()


class ContactListSerializer(serializers.ModelSerializer):
    owner = serializers.IntegerField(source="contact_owner_id", read_only=True)
    owner_details = serializers.SerializerMethodField()
    account_info = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "id",
            "salutation",
            "first_name",
            "last_name",
            "email",
            "phone",
            "mobile",
            "title",
            "department",
            "contact_owner",
            "owner",
            "owner_details",
            "account",
            "account_info",
            "lead_source",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_owner_details(self, obj: Contact) -> dict[str, Any] | None:
        if not obj.contact_owner:
            return None
        return ContactOwnerSerializer(
            {"id": obj.contact_owner_id, "email": obj.contact_owner.email}
        ).data

    def get_account_info(self, obj: Contact) -> dict[str, Any] | None:
        if not obj.account:
            return None
        return ContactAccountSerializer({"id": obj.account_id, "name": obj.account.name}).data


class ContactDetailSerializer(serializers.ModelSerializer):
    owner = serializers.IntegerField(source="contact_owner_id", read_only=True)
    owner_details = serializers.SerializerMethodField()
    account_info = serializers.SerializerMethodField()
    lead_conversion_reference = serializers.SerializerMethodField()
    notes_count = serializers.SerializerMethodField()
    activities_count = serializers.SerializerMethodField()
    timeline_count = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "id",
            "salutation",
            "first_name",
            "last_name",
            "contact_owner",
            "owner",
            "owner_details",
            "account",
            "account_info",
            "email",
            "secondary_email",
            "phone",
            "mobile",
            "other_phone",
            "home_phone",
            "assistant_phone",
            "title",
            "department",
            "assistant",
            "date_of_birth",
            "lead_source",
            "vendor_name",
            "created_from_lead",
            "lead_conversion_reference",
            "is_active",
            "notes_count",
            "activities_count",
            "timeline_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["is_active", "created_at", "updated_at"]

    def get_owner_details(self, obj: Contact) -> dict[str, Any] | None:
        if not obj.contact_owner:
            return None
        return ContactOwnerSerializer(
            {"id": obj.contact_owner_id, "email": obj.contact_owner.email}
        ).data

    def get_account_info(self, obj: Contact) -> dict[str, Any] | None:
        if not obj.account:
            return None
        return ContactAccountSerializer({"id": obj.account_id, "name": obj.account.name}).data

    def get_lead_conversion_reference(self, obj: Contact) -> dict[str, Any] | None:
        if not obj.created_from_lead:
            return None
        lead = obj.created_from_lead
        return ContactLeadReferenceSerializer(
            {
                "id": lead.id,
                "first_name": lead.first_name,
                "last_name": lead.last_name,
                "email": lead.email,
            }
        ).data

    def get_notes_count(self, obj: Contact) -> int:
        return getattr(obj, "notes_count", None) or obj.notes.count()

    def get_activities_count(self, obj: Contact) -> int:
        return getattr(obj, "activities_count", None) or obj.activities.count()

    def get_timeline_count(self, obj: Contact) -> int:
        return self.get_activities_count(obj)


class ContactWriteSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(
        source="contact_owner",
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Contact
        fields = [
            "salutation",
            "first_name",
            "last_name",
            "contact_owner",
            "owner",
            "account",
            "email",
            "secondary_email",
            "phone",
            "mobile",
            "other_phone",
            "home_phone",
            "assistant_phone",
            "title",
            "department",
            "assistant",
            "date_of_birth",
            "lead_source",
            "vendor_name",
            "created_from_lead",
        ]

    def validate_email(self, value: str | None) -> str | None:
        if not value:
            return value

        email = value.lower()
        queryset = Contact.objects.filter(email__iexact=email, is_active=True)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("An active contact with this email already exists.")
        return email

    def _validate_phone(self, value: str | None, field_name: str) -> None:
        if value and not PHONE_PATTERN.match(value):
            raise serializers.ValidationError({field_name: "Enter a valid phone number."})

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        for field_name in ["phone", "mobile", "other_phone", "home_phone", "assistant_phone"]:
            self._validate_phone(attrs.get(field_name), field_name)

        instance = getattr(self, "instance", None)
        email = attrs.get("email", getattr(instance, "email", None))
        phone_values = [
            attrs.get("phone", getattr(instance, "phone", None)),
            attrs.get("mobile", getattr(instance, "mobile", None)),
            attrs.get("other_phone", getattr(instance, "other_phone", None)),
            attrs.get("home_phone", getattr(instance, "home_phone", None)),
        ]
        if not email and not any(phone_values):
            raise serializers.ValidationError(
                "At least one contact method (email or phone) is required."
            )

        request = self.context.get("request")
        owner = attrs.get("contact_owner", getattr(instance, "contact_owner", None))
        if request and owner and not can_access_contact_owner(user=request.user, owner_id=owner.id):
            raise serializers.ValidationError({"contact_owner": "You cannot assign this owner."})
        return attrs


class ContactActionSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False, default="")


class ContactLogCallSerializer(serializers.Serializer):
    call_summary = serializers.CharField(max_length=255)
    call_outcome = serializers.CharField(max_length=255, required=False, allow_blank=True)


class ContactSendEmailSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    body = serializers.CharField()


class ContactNoteCreateSerializer(serializers.Serializer):
    note = serializers.CharField()


class ContactNoteUpdateSerializer(serializers.Serializer):
    note = serializers.CharField()


class ContactTimelineSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source="created_at")

    class Meta:
        model = LeadActivity
        fields = ["id", "action", "description", "user", "timestamp"]

    def get_user(self, obj: LeadActivity) -> str | None:
        if not obj.user:
            return None
        return getattr(obj.user, "email", str(obj.user))


class ContactNoteSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = LeadNote
        fields = ["id", "note", "created_by", "created_at"]

    def get_created_by(self, obj: LeadNote) -> str | None:
        if not obj.created_by:
            return None
        return getattr(obj.created_by, "email", str(obj.created_by))
