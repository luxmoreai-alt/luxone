from rest_framework import serializers

from .models import Lead


class LeadListSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id",
            "first_name",
            "last_name",
            "company",
            "email",
            "phone",
            "lead_source",
            "owner",
            "owner_email",
            "created_at",
        ]

    def get_owner_email(self, obj):
        if not obj.owner:
            return None
        return getattr(obj.owner, "email", str(obj.owner))


class LeadDetailSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id",
            "first_name",
            "last_name",
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
            "converted_account",
            "converted_contact",
            "converted_deal",
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
        if not obj.owner:
            return None
        return getattr(obj.owner, "email", str(obj.owner))


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
