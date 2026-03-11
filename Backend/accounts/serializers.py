from rest_framework import serializers

from .models import Account


class AccountSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = "__all__"

    def get_owner_email(self, obj):
        if not obj.owner:
            return None
        return getattr(obj.owner, "email", str(obj.owner))
