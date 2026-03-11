from django.conf import settings
from django.db import models

class Deal(models.Model):
    class DealStage(models.TextChoices):
        QUALIFICATION = "Qualification", "Qualification"
        OPEN = "Open", "Open"
        WON = "Won", "Won"
        LOST = "Lost", "Lost"

    account = models.ForeignKey(
        "accounts.Account",
        on_delete=models.CASCADE,
        related_name="deals",
    )
    contact = models.ForeignKey(
        "contacts.Contact",
        on_delete=models.SET_NULL,
        related_name="deals",
        null=True,
        blank=True,
    )
    lead = models.ForeignKey(
        "leads.Lead",
        on_delete=models.SET_NULL,
        related_name="deals",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    stage = models.CharField(
        max_length=50,
        choices=DealStage.choices,
        default=DealStage.QUALIFICATION,
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
    )
    value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        blank=True,
        null=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="deals",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name
