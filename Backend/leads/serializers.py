from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from core.user_display import get_user_display_name
from .models import Lead
from integrations.models import IntegrationLeadSourceEvent, SyncedEmailMessage


class LeadOwnerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField(allow_blank=True, allow_null=True)
    name = serializers.CharField()


class LeadLinkedRecordSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class LeadListSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_details = serializers.SerializerMethodField()
    lead_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id",
            "first_name",
            "last_name",
            "lead_name",
            "company",
            "email",
            "phone",
            "lead_source",
            "owner",
            "owner_email",
            "owner_name",
            "owner_details",
            "created_at",
        ]

    def get_owner_email(self, obj):
        try:
            owner = obj.owner
        except ObjectDoesNotExist:
            return None
        if not owner:
            return None
        return getattr(owner, "email", str(owner))

    def get_owner_name(self, obj):
        try:
            owner = obj.owner
        except ObjectDoesNotExist:
            return None
        if not owner:
            return None
        return get_user_display_name(owner)

    def get_owner_details(self, obj):
        try:
            owner = obj.owner
        except ObjectDoesNotExist:
            return None
        if not owner:
            return None
        return LeadOwnerSerializer(
            {
                "id": obj.owner_id,
                "email": getattr(owner, "email", "") or "",
                "name": get_user_display_name(owner),
            }
        ).data

    def get_lead_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class LeadDetailSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_details = serializers.SerializerMethodField()
    lead_name = serializers.SerializerMethodField()
    converted_account_info = serializers.SerializerMethodField()
    converted_contact_info = serializers.SerializerMethodField()
    converted_deal_info = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id",
            "first_name",
            "last_name",
            "lead_name",
            "company",
            "title",
            "email",
            "phone",
            "mobile",
            "website",
            "lead_source",
            "lead_status",
            "industry",
            "annual_revenue",
            "employee_count",
            "rating",
            "owner",
            "owner_email",
            "owner_name",
            "owner_details",
            "converted_account",
            "converted_account_info",
            "converted_contact",
            "converted_contact_info",
            "converted_deal",
            "converted_deal_info",
            "street",
            "city",
            "state",
            "country",
            "zip_code",
            "skype_id",
            "secondary_email",
            "description",
            "created_at",
            "updated_at",
        ]

    def get_owner_email(self, obj):
        try:
            owner = obj.owner
        except ObjectDoesNotExist:
            return None
        if not owner:
            return None
        return getattr(owner, "email", str(owner))

    def get_owner_name(self, obj):
        try:
            owner = obj.owner
        except ObjectDoesNotExist:
            return None
        if not owner:
            return None
        return get_user_display_name(owner)

    def get_owner_details(self, obj):
        try:
            owner = obj.owner
        except ObjectDoesNotExist:
            return None
        if not owner:
            return None
        return LeadOwnerSerializer(
            {
                "id": obj.owner_id,
                "email": getattr(owner, "email", "") or "",
                "name": get_user_display_name(owner),
            }
        ).data

    def get_lead_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

    def get_converted_account_info(self, obj):
        try:
            account = obj.converted_account
        except ObjectDoesNotExist:
            return None
        if not account:
            return None
        return LeadLinkedRecordSerializer({"id": account.id, "name": account.account_name}).data

    def get_converted_contact_info(self, obj):
        try:
            contact = obj.converted_contact
        except ObjectDoesNotExist:
            return None
        if not contact:
            return None
        return LeadLinkedRecordSerializer(
            {"id": contact.id, "name": f"{contact.first_name} {contact.last_name}".strip()}
        ).data

    def get_converted_deal_info(self, obj):
        try:
            deal = obj.converted_deal
        except ObjectDoesNotExist:
            return None
        if not deal:
            return None
        return LeadLinkedRecordSerializer({"id": deal.id, "name": deal.deal_name}).data


class LeadCloneResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    lead_id = serializers.IntegerField()


class LeadNoteCreateSerializer(serializers.Serializer):
    note = serializers.CharField()


class LeadConvertRequestSerializer(serializers.Serializer):
    create_deal = serializers.BooleanField(default=False, required=False)
    deal_name = serializers.CharField(required=False, allow_blank=True)
    deal_value = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        required=False,
        allow_null=True,
    )


class LeadConvertResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    account_id = serializers.IntegerField()
    contact_id = serializers.IntegerField()
    deal_id = serializers.IntegerField(allow_null=True, required=False)


class LeadActionSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False, default="")


class LeadCallSerializer(serializers.Serializer):
    call_summary = serializers.CharField(max_length=255)
    call_outcome = serializers.CharField(max_length=255, required=False, allow_blank=True)


class LeadMeetingSerializer(serializers.Serializer):
    meeting_subject = serializers.CharField(max_length=255)
    agenda = serializers.CharField(required=False, allow_blank=True)


class LeadSendEmailSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    body = serializers.CharField()


class LeadEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyncedEmailMessage
        fields = [
            "id",
            "subject",
            "from_email",
            "to_emails",
            "direction",
            "status",
            "received_at",
            "sent_at",
            "is_read",
        ]


class LeadConnectedRecordSerializer(serializers.ModelSerializer):
    source_label = serializers.SerializerMethodField()

    class Meta:
        model = IntegrationLeadSourceEvent
        fields = [
            "id",
            "source_type",
            "source_label",
            "source_reference",
            "created_at",
        ]

    def get_source_label(self, obj):
        return obj.payload.get("source_label") or obj.source_reference
