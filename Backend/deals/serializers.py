from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import serializers

from activities.models import LeadActivity
from notes.models import LeadNote

from .models import Deal, DealStage
from .permissions import can_access_deal_owner

User = get_user_model()


class DealStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealStage
        fields = ["id", "stage_name", "probability", "order", "is_closed_stage"]


class DealListSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="deal_name", read_only=True)
    owner = serializers.IntegerField(source="deal_owner_id", read_only=True)
    owner_email = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    stage = serializers.CharField(source="stage.stage_name", read_only=True)
    value = serializers.DecimalField(source="expected_revenue", max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "deal_name",
            "account",
            "account_name",
            "contact",
            "contact_name",
            "deal_owner",
            "owner",
            "owner_email",
            "amount",
            "expected_revenue",
            "value",
            "stage",
            "probability",
            "closing_date",
            "campaign_source",
            "is_closed",
            "is_won",
            "created_at",
        ]

    def get_owner_email(self, obj: Deal) -> str | None:
        if not obj.deal_owner:
            return None
        return obj.deal_owner.email

    def get_account_name(self, obj: Deal) -> str | None:
        if not obj.account:
            return None
        return obj.account.account_name

    def get_contact_name(self, obj: Deal) -> str | None:
        if not obj.contact:
            return None
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()


class DealTimelineSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source="created_at")

    class Meta:
        model = LeadActivity
        fields = ["id", "action", "description", "user", "timestamp"]

    def get_user(self, obj: LeadActivity) -> str | None:
        if not obj.user:
            return None
        return getattr(obj.user, "email", str(obj.user))


class DealNoteSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = LeadNote
        fields = ["id", "note", "created_by", "created_at"]

    def get_created_by(self, obj: LeadNote) -> str | None:
        if not obj.created_by:
            return None
        return getattr(obj.created_by, "email", str(obj.created_by))


class DealDetailSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="deal_name", read_only=True)
    owner = serializers.IntegerField(source="deal_owner_id", read_only=True)
    owner_email = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    stage = serializers.CharField(source="stage.stage_name", read_only=True)
    value = serializers.DecimalField(source="expected_revenue", max_digits=15, decimal_places=2, read_only=True)
    timeline = serializers.SerializerMethodField()
    notes = serializers.SerializerMethodField()
    activities = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "deal_name",
            "account",
            "account_name",
            "contact",
            "contact_name",
            "lead",
            "deal_owner",
            "owner",
            "owner_email",
            "amount",
            "expected_revenue",
            "value",
            "stage",
            "probability",
            "closing_date",
            "type",
            "lead_source",
            "campaign_source",
            "next_step",
            "forecast_category",
            "description",
            "is_closed",
            "is_won",
            "timeline",
            "notes",
            "activities",
            "is_active",
            "created_at",
            "updated_at",
        ]

    def get_owner_email(self, obj: Deal) -> str | None:
        if not obj.deal_owner:
            return None
        return obj.deal_owner.email

    def get_account_name(self, obj: Deal) -> str | None:
        if not obj.account:
            return None
        return obj.account.account_name

    def get_contact_name(self, obj: Deal) -> str | None:
        if not obj.contact:
            return None
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()

    def get_timeline(self, obj: Deal):
        activities = getattr(obj, "_prefetched_objects_cache", {}).get("activities")
        if activities is None:
            activities = obj.activities.select_related("user").all()
        return DealTimelineSerializer(activities, many=True).data

    def get_notes(self, obj: Deal):
        notes = getattr(obj, "_prefetched_objects_cache", {}).get("notes")
        if notes is None:
            notes = obj.notes.select_related("created_by").all()
        return DealNoteSerializer(notes, many=True).data

    def get_activities(self, obj: Deal):
        activities = getattr(obj, "_prefetched_objects_cache", {}).get("activities")
        if activities is None:
            activities = obj.activities.select_related("user").all()
        return DealTimelineSerializer(activities, many=True).data


class DealWriteSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="deal_name", required=False)
    owner = serializers.PrimaryKeyRelatedField(
        source="deal_owner",
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    value = serializers.DecimalField(
        source="expected_revenue",
        max_digits=15,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    stage = serializers.SlugRelatedField(
        slug_field="stage_name",
        queryset=DealStage.objects.all(),
        required=False,
    )

    class Meta:
        model = Deal
        fields = [
            "deal_owner",
            "owner",
            "deal_name",
            "name",
            "account",
            "contact",
            "lead",
            "amount",
            "expected_revenue",
            "value",
            "stage",
            "probability",
            "closing_date",
            "type",
            "lead_source",
            "campaign_source",
            "next_step",
            "forecast_category",
            "description",
        ]

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        request = self.context.get("request")
        instance = getattr(self, "instance", None)

        deal_name = attrs.get("deal_name", getattr(instance, "deal_name", None))
        if not deal_name:
            raise serializers.ValidationError({"deal_name": "deal_name is required."})

        owner = attrs.get("deal_owner", getattr(instance, "deal_owner", None))
        if request and owner and not can_access_deal_owner(user=request.user, owner_id=owner.id):
            raise serializers.ValidationError({"deal_owner": "You cannot assign this owner."})

        probability = attrs.get("probability")
        if probability is not None and (probability < 0 or probability > 100):
            raise serializers.ValidationError({"probability": "Probability must be between 0 and 100."})
        return attrs


class DealStageUpdateSerializer(serializers.Serializer):
    stage = serializers.SlugRelatedField(
        slug_field="stage_name",
        queryset=DealStage.objects.all(),
    )


class DealMassDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class DealMassUpdateSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    payload = serializers.DictField()


class DealActionSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False, default="")


class DealCallSerializer(serializers.Serializer):
    call_summary = serializers.CharField(max_length=255)
    call_outcome = serializers.CharField(max_length=255, required=False, allow_blank=True)


class DealMeetingSerializer(serializers.Serializer):
    meeting_subject = serializers.CharField(max_length=255)
    agenda = serializers.CharField(required=False, allow_blank=True)


class DealPipelineCardSerializer(serializers.Serializer):
    deal_id = serializers.IntegerField()
    deal_name = serializers.CharField()
    account_name = serializers.CharField(allow_null=True)
    contact_name = serializers.CharField(allow_null=True)
    owner = serializers.CharField(allow_null=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, allow_null=True)
    closing_date = serializers.DateField(allow_null=True)
    stage = serializers.CharField()
    probability = serializers.IntegerField(allow_null=True)


class DealNoteCreateSerializer(serializers.Serializer):
    note = serializers.CharField()
