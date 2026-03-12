from copy import deepcopy

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.text import slugify

from activities.services import create_lead_activity
from accounts.models import Account
from accounts.services import create_account_from_lead
from contacts.services import create_contact_from_lead
from deals.services import create_deal_from_lead
from notes.models import LeadNote
from notes.services import create_note

from .models import Lead


def bulk_delete_leads(lead_ids):
    with transaction.atomic():
        deleted_count, _ = Lead.objects.filter(id__in=lead_ids).delete()
    return deleted_count


def create_activity_log(*, lead, action, description="", user=None):
    return create_lead_activity(
        lead=lead,
        action=action,
        description=description,
        user=user,
    )


def create_lead_note(*, lead, note, created_by=None):
    with transaction.atomic():
        lead_note = create_note(
            lead=lead,
            note=note,
            created_by=created_by,
        )
        create_activity_log(
            lead=lead,
            action="Note Added",
            description=note,
            user=created_by,
        )
        return lead_note


def list_lead_timeline(*, lead):
    return lead.activities.select_related("user").all()


def list_lead_notes(*, lead):
    return lead.notes.select_related("created_by").all()


def create_note_for_lead(*, lead, note, user=None):
    return create_lead_note(lead=lead, note=note, created_by=user)


def get_lead_timeline(*, lead):
    return list_lead_timeline(lead=lead)


def _build_clone_email(email):
    local_part, domain_part = email.split("@", 1)
    base_local = slugify(local_part.replace("+", " ")) or "lead"
    candidate = f"{base_local}-clone@{domain_part}"
    counter = 1
    while Lead.objects.filter(email=candidate).exists():
        candidate = f"{base_local}-clone-{counter}@{domain_part}"
        counter += 1
    return candidate


def clone_lead(*, lead, user=None):
    with transaction.atomic():
        lead_data = {
            field.name: deepcopy(getattr(lead, field.name))
            for field in lead._meta.fields
            if field.name not in {"id", "created_at", "updated_at"}
        }
        lead_data["email"] = _build_clone_email(lead.email)
        cloned_lead = Lead.objects.create(**lead_data)
        create_activity_log(
            lead=cloned_lead,
            action="Lead Cloned",
            description=f"Lead cloned from lead #{lead.pk}.",
            user=user,
        )
    return cloned_lead


def convert_lead(*, lead, user=None, create_deal=False, deal_name=None, deal_value=None):
    if lead.lead_status == Lead.LeadStatus.CONVERTED:
        raise ValidationError("Lead has already been converted.")

    if not lead.company or not lead.company.strip():
        raise ValidationError("Account creation requires company.")

    with transaction.atomic():
        account = Account.objects.filter(name__iexact=lead.company.strip()).first()
        if not account:
            account = create_account_from_lead(
                lead=lead,
                owner=lead.owner or user,
            )

        contact = create_contact_from_lead(
            lead=lead,
            account=account,
            owner=lead.owner or user,
        )

        deal = None
        if create_deal:
            deal = create_deal_from_lead(
                lead=lead,
                account=account,
                contact=contact,
                owner=lead.owner or user,
                deal_name=deal_name,
                deal_value=deal_value,
            )

        lead.lead_status = Lead.LeadStatus.CONVERTED
        lead.converted_account = account
        lead.converted_contact = contact
        lead.converted_deal = deal
        lead.save(
            update_fields=[
                "lead_status",
                "converted_account",
                "converted_contact",
                "converted_deal",
                "updated_at",
            ]
        )

        create_activity_log(
            lead=lead,
            action="Lead Converted",
            description=(
                f"Lead converted to account #{account.pk}, "
                f"contact #{contact.pk}"
                + (f", and deal #{deal.pk}." if deal else ".")
            ),
            user=user,
        )

    return {
        "account": account,
        "contact": contact,
        "deal": deal,
    }
