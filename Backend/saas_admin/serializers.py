from rest_framework import serializers
from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'


class CompanyUsageStatsSerializer(serializers.Serializer):
    total_crm_users = serializers.IntegerField()
    total_leads = serializers.IntegerField()
    storage_used_mb = serializers.FloatField()


class CompanyDetailSerializer(CompanySerializer):
    usage_stats = serializers.SerializerMethodField()

    def get_usage_stats(self, obj):
        return self.context.get("usage_stats", {})
