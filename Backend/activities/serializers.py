from rest_framework import serializers

from .models import LeadActivity


class LeadActivitySerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source="created_at")

    class Meta:
        model = LeadActivity
        fields = ["id", "action", "description", "user", "timestamp"]

    def get_user(self, obj):
        if not obj.user:
            return None
        return getattr(obj.user, "username", None) or getattr(obj.user, "email", str(obj.user))
