from rest_framework import serializers

from .models import Lead


class LeadListSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()
    latest_activity = serializers.SerializerMethodField()

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
            "latest_activity",
        ]

    def get_owner_email(self, obj):
        if not obj.owner:
            return None
        return getattr(obj.owner, "email", str(obj.owner))

    def get_latest_activity(self, obj):
        allowed_actions = {"Call logged", "Task created", "Meeting scheduled"}
        activity = next(
            (a for a in obj.activities.all() if a.action in allowed_actions),
            None,
        )
        if not activity:
            return None
        action = activity.action.lower()
        if "call" in action:
            activity_type = "call"
        elif "task" in action:
            activity_type = "task"
        else:
            activity_type = "meeting"
        return {
            "date": f"{activity.created_at.strftime('%b')} {activity.created_at.day}",
            "type": activity_type,
            "action": activity.action,
        }


class LeadDetailSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()
    converted_account_name = serializers.SerializerMethodField()
    converted_contact_name = serializers.SerializerMethodField()
    converted_deal_name = serializers.SerializerMethodField()

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
            "converted_account_name",
            "converted_contact_name",
            "converted_deal_name",
            "street",
            "city",
            "state",
            "country",
            "zip_code",
            "skype_id",
            "secondary_email",
            "description",
            "tags",
            "created_at",
            "updated_at",
        ]

    def get_owner_email(self, obj):
        if not obj.owner:
            return None
        return getattr(obj.owner, "email", str(obj.owner))

    def get_converted_account_name(self, obj):
        if not obj.converted_account:
            return None
        return obj.converted_account.account_name

    def get_converted_contact_name(self, obj):
        if not obj.converted_contact:
            return None
        return f"{obj.converted_contact.first_name} {obj.converted_contact.last_name}".strip()

    def get_converted_deal_name(self, obj):
        if not obj.converted_deal:
            return None
        return obj.converted_deal.deal_name


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
    call_type = serializers.ChoiceField(choices=["Outbound", "Inbound"], required=False, default="Outbound")
    call_start_time = serializers.DateTimeField(required=False, allow_null=True, default=None)
    reminder = serializers.CharField(max_length=64, required=False, allow_blank=True, default="None")
    duration_minutes = serializers.IntegerField(required=False, default=0, min_value=0)
    duration_seconds = serializers.IntegerField(required=False, default=0, min_value=0, max_value=59)
    voice_recording = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class LeadMeetingSerializer(serializers.Serializer):
    meeting_subject = serializers.CharField(max_length=255)
    agenda = serializers.CharField(required=False, allow_blank=True)


class LeadSendEmailSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    body = serializers.CharField()


class LeadAddTagsSerializer(serializers.Serializer):
    tags = serializers.ListField(child=serializers.CharField(max_length=50), min_length=1)
