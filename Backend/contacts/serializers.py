from rest_framework import serializers

from .models import Contact


class ContactSerializer(serializers.ModelSerializer):
    owner_email = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Contact
        fields = "__all__"

    def get_owner_email(self, obj):
        if not obj.owner:
            return None
        return getattr(obj.owner, "email", str(obj.owner))

    def get_account_name(self, obj):
        if not obj.account:
            return None
        return obj.account.name
