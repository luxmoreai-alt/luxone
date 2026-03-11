from rest_framework import serializers

from .models import Deal


class DealSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    lead_name = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = "__all__"

    def get_owner_email(self, obj):
        if not obj.owner:
            return None
        return getattr(obj.owner, "email", str(obj.owner))

    def get_account_name(self, obj):
        if not obj.account:
            return None
        return obj.account.name

    def get_contact_name(self, obj):
        if not obj.contact:
            return None
        return f"{obj.contact.first_name} {obj.contact.last_name}".strip()

    def get_lead_name(self, obj):
        if not obj.lead:
            return None
        return f"{obj.lead.first_name} {obj.lead.last_name}".strip()
