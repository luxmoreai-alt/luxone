from django.conf import settings
from django.db import models

class LeadActivity(models.Model):
    lead = models.ForeignKey(
        "leads.Lead",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="lead_activities",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["lead", "created_at"]),
            models.Index(fields=["contact", "created_at"]),
            models.Index(fields=["account", "created_at"]),
            models.Index(fields=["deal", "created_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        record_id = self.lead_id or self.contact_id or self.account_id or self.deal_id
        return f"{self.action} - {record_id}"
