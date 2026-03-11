from django.contrib import admin

from .models import Deal


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "account", "stage", "value", "owner")
    search_fields = ("name",)
