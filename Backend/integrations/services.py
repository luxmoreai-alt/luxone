from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
import logging
import re
from typing import Any
from urllib.parse import urlparse

from django.db import transaction
from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.utils import timezone

from accounts.models import Account
from contacts.models import Contact
from deals.models import Deal
from leads.models import Lead
from support.models import SupportCase

from .models import (
    BCCDropboxSetting,
    BCCDropboxVerifiedAddress,
    EmailAuthenticationDomain,
    EmailParserInbox,
    EmailProviderIntegration,
    EmailRelayServer,
    EmailSyncLog,
    IntegrationLeadSourceEvent,
    SocialAccount,
    SocialLeadAutomationRule,
    SocialMessage,
    SyncedEmailMessage,
    VisitorLeadEvent,
    VisitorTrackingPortal,
    VisitorTrackingSetting,
)
from .permissions import is_integration_admin
from .utils import (
    build_tracking_code,
    generate_integration_email,
    generate_verification_code,
    make_placeholder_email,
    normalize_email,
    split_name,
)

logger = logging.getLogger(__name__)
HIGH_INTENT_PATH_KEYWORDS = ("pricing", "quote", "demo", "trial", "contact", "checkout", "purchase")
COMPLAINT_KEYWORDS = ("complaint", "issue", "problem", "bug", "error", "angry", "not working", "failed")


def _json_safe(value: Any):
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except TypeError:
            return value
    return value


@dataclass
class MatchedCRMRecord:
    lead: Lead | None = None
    contact: Contact | None = None
    account: Account | None = None
    deal: Deal | None = None
    support_case: SupportCase | None = None


def _extract_domain(email: str | None) -> str | None:
    normalized_email = normalize_email(email)
    if not normalized_email or "@" not in normalized_email:
        return None
    return normalized_email.split("@", 1)[1]


def _account_domain_candidates(account: Account) -> set[str]:
    candidates: set[str] = set()
    for value in (account.website, account.account_site):
        if not value:
            continue
        parsed = urlparse(value if "://" in value else f"https://{value}")
        domain = (parsed.netloc or parsed.path or "").lower().strip()
        if domain.startswith("www."):
            domain = domain[4:]
        if domain:
            candidates.add(domain)
    return candidates


def match_crm_records_by_domain(domain: str | None) -> MatchedCRMRecord:
    if not domain:
        return MatchedCRMRecord()
    normalized_domain = domain.lower().strip()
    for account in Account.objects.filter(is_active=True):
        if normalized_domain in _account_domain_candidates(account):
            contact = account.contacts.filter(is_active=True).order_by("-updated_at").first()
            deal = account.deals.filter(is_active=True).order_by("-updated_at").first()
            support_case = account.support_cases.filter(is_active=True).order_by("-updated_at").first()
            return MatchedCRMRecord(contact=contact, account=account, deal=deal, support_case=support_case)
    return MatchedCRMRecord()


def match_crm_records_by_phone(phone: str | None) -> MatchedCRMRecord:
    normalized_phone = (phone or "").strip()
    if not normalized_phone:
        return MatchedCRMRecord()
    contact = Contact.objects.select_related("account").filter(
        Q(phone__iexact=normalized_phone) | Q(mobile__iexact=normalized_phone),
        is_active=True,
    ).first()
    if contact:
        deal = contact.deals.filter(is_active=True).order_by("-updated_at").first()
        support_case = contact.support_cases.filter(is_active=True).order_by("-updated_at").first()
        return MatchedCRMRecord(contact=contact, account=contact.account, deal=deal, support_case=support_case)
    lead = Lead.objects.filter(Q(phone__iexact=normalized_phone) | Q(mobile__iexact=normalized_phone)).first()
    if lead:
        return MatchedCRMRecord(
            lead=lead,
            contact=lead.converted_contact,
            account=lead.converted_account,
            deal=lead.converted_deal,
        )
    return MatchedCRMRecord()


def match_crm_records_by_reference(text: str | None) -> MatchedCRMRecord:
    haystack = (text or "").strip()
    if not haystack:
        return MatchedCRMRecord()
    case_numbers = re.findall(r"CASE-\d+", haystack, flags=re.IGNORECASE)
    support_case = SupportCase.objects.filter(
        Q(case_number__in=case_numbers)
        | Q(subject__icontains=haystack)
    ).select_related("related_contact", "account", "deal").order_by("-updated_at").first()
    if support_case:
        return MatchedCRMRecord(
            contact=support_case.related_contact,
            account=support_case.account,
            deal=support_case.deal,
            support_case=support_case,
        )
    deal = Deal.objects.filter(Q(deal_name__icontains=haystack) | Q(id__in=re.findall(r"\d+", haystack))).select_related("account", "contact").order_by("-updated_at").first()
    if deal:
        return MatchedCRMRecord(contact=deal.contact, account=deal.account, deal=deal)
    return MatchedCRMRecord()


def match_crm_records(*, email: str | None = None, phone: str | None = None, text: str | None = None) -> MatchedCRMRecord:
    for candidate in (
        match_crm_records_by_email(email),
        match_crm_records_by_phone(phone),
        match_crm_records_by_domain(_extract_domain(email)),
        match_crm_records_by_reference(text),
    ):
        if candidate.lead or candidate.contact or candidate.account or candidate.deal or candidate.support_case:
            return candidate
    return MatchedCRMRecord()


def visible_queryset(queryset, user, owner_field: str | None = "created_by"):
    if is_integration_admin(user) or owner_field is None:
        return queryset
    if owner_field == "user":
        return queryset.filter(user=user)
    return queryset.filter(**{owner_field: user})


def get_or_create_placeholder_lead(*, email: str | None, name: str | None, company: str | None, owner=None) -> Lead:
    normalized_email = normalize_email(email) or make_placeholder_email("lead")
    existing = Lead.objects.filter(email__iexact=normalized_email).first()
    if existing:
        return existing
    first_name, last_name = split_name(name, fallback_first="New")
    return Lead.objects.create(
        first_name=first_name,
        last_name=last_name,
        company=(company or "Unassigned").strip() or "Unassigned",
        email=normalized_email,
        owner=owner,
        lead_source="Integration",
        lead_status="New",
    )


def get_or_create_contact_from_event(*, email: str | None, name: str | None, owner=None, account=None) -> Contact:
    normalized_email = normalize_email(email)
    if normalized_email:
        existing = Contact.objects.filter(email__iexact=normalized_email, is_active=True).first()
        if existing:
            return existing
    first_name, last_name = split_name(name, fallback_first="Visitor")
    return Contact.objects.create(
        first_name=first_name,
        last_name=last_name,
        email=normalized_email,
        contact_owner=owner,
        account=account,
    )


def match_crm_records_by_email(email: str | None) -> MatchedCRMRecord:
    normalized_email = normalize_email(email)
    if not normalized_email:
        return MatchedCRMRecord()

    contact = (
        Contact.objects.select_related("account")
        .filter(
            Q(email__iexact=normalized_email) | Q(secondary_email__iexact=normalized_email),
            is_active=True,
        )
        .first()
    )
    if contact:
        deal = contact.deals.filter(is_active=True).order_by("-updated_at").first()
        support_case = contact.support_cases.filter(is_active=True).order_by("-updated_at").first()
        return MatchedCRMRecord(
            contact=contact,
            account=contact.account,
            deal=deal,
            support_case=support_case,
        )

    lead = (
        Lead.objects.filter(
            Q(email__iexact=normalized_email) | Q(secondary_email__iexact=normalized_email)
        )
        .select_related("converted_account", "converted_contact", "converted_deal")
        .first()
    )
    if lead:
        support_case = None
        if lead.converted_contact:
            support_case = lead.converted_contact.support_cases.filter(is_active=True).order_by("-updated_at").first()
        return MatchedCRMRecord(
            lead=lead,
            contact=lead.converted_contact,
            account=lead.converted_account,
            deal=lead.converted_deal,
            support_case=support_case,
        )
    return MatchedCRMRecord()


def match_message_to_lead(message: dict[str, Any]) -> Lead | None:
    for candidate in [message.get("from_email"), *(message.get("to_emails") or [])]:
        match = match_crm_records_by_email(candidate)
        if match.lead:
            return match.lead
    return None


def get_lead_emails(lead_id: int):
    return SyncedEmailMessage.objects.filter(lead_id=lead_id).select_related("provider_integration").order_by("-received_at", "-created_at")


def get_lead_connected_records(lead_id: int):
    return IntegrationLeadSourceEvent.objects.filter(lead_id=lead_id).select_related(
        "lead",
        "contact",
        "account",
        "deal",
        "support_case",
    ).order_by("-created_at")


def create_source_event(
    *,
    source_type: str,
    source_reference: str,
    payload: dict[str, Any],
    status: str,
    lead: Lead | None = None,
    contact: Contact | None = None,
    account: Account | None = None,
    deal: Deal | None = None,
    support_case: SupportCase | None = None,
) -> IntegrationLeadSourceEvent:
    return IntegrationLeadSourceEvent.objects.create(
        source_type=source_type,
        source_reference=source_reference,
        payload=_json_safe(payload),
        status=status,
        lead=lead,
        contact=contact,
        account=account,
        deal=deal,
        support_case=support_case,
    )


def generate_parser_address(parser_name: str) -> str:
    slug = "-".join((parser_name or "parser").strip().lower().split()) or "parser"
    return generate_integration_email(slug)


def generate_bcc_address() -> str:
    return generate_integration_email("bcc")


def validate_relay_configuration(data: dict[str, Any]) -> None:
    port = data.get("port")
    if port and int(port) <= 0:
        raise ValueError("Relay port must be a positive integer.")
    if data.get("authentication_required") and not data.get("username"):
        raise ValueError("Username is required when relay authentication is enabled.")


def confirm_organization_email(instance) -> None:
    instance.confirmation_status = instance.ConfirmationStatus.CONFIRMED
    instance.is_verified = True
    instance.verified_at = timezone.now()
    instance.save(update_fields=["confirmation_status", "is_verified", "verified_at", "updated_at"])


def regenerate_bcc_dropbox(setting: BCCDropboxSetting) -> BCCDropboxSetting:
    setting.dropbox_email_address = generate_bcc_address()
    setting.save(update_fields=["dropbox_email_address", "updated_at"])
    return setting


def add_verified_bcc_address(*, setting: BCCDropboxSetting, email_address: str) -> BCCDropboxVerifiedAddress:
    address, _ = BCCDropboxVerifiedAddress.objects.update_or_create(
        bcc_setting=setting,
        email_address=normalize_email(email_address),
        defaults={
            "verification_status": BCCDropboxVerifiedAddress.VerificationStatus.PENDING,
            "verification_code": generate_verification_code(),
            "verified_at": None,
        },
    )
    return address


def verify_bcc_address(*, setting: BCCDropboxSetting, email_address: str, verification_code: str) -> BCCDropboxVerifiedAddress:
    address = BCCDropboxVerifiedAddress.objects.get(
        bcc_setting=setting,
        email_address=normalize_email(email_address),
    )
    if address.verification_code != verification_code:
        raise ValueError("Verification code is invalid.")
    address.verification_status = BCCDropboxVerifiedAddress.VerificationStatus.VERIFIED
    address.verified_at = timezone.now()
    address.save(update_fields=["verification_status", "verified_at", "updated_at"])
    return address


def check_domain_status(domain: EmailAuthenticationDomain) -> EmailAuthenticationDomain:
    domain.authentication_status = EmailAuthenticationDomain.AuthenticationStatus.AUTHENTICATED
    domain.spf_status = "configured"
    domain.dkim_status = "configured"
    domain.dmarc_status = "configured"
    domain.email_status = "ready"
    domain.is_verified = True
    domain.last_checked_at = timezone.now()
    domain.save()
    return domain


def connect_social_account(account: SocialAccount, token_payload: dict[str, Any]) -> SocialAccount:
    account.is_connected = True
    account.connected_at = timezone.now()
    account.access_token = token_payload.get("access_token") or account.access_token
    account.refresh_token = token_payload.get("refresh_token") or account.refresh_token
    account.account_name = token_payload.get("account_name") or account.account_name
    account.handle = token_payload.get("handle") or account.handle
    account.page_id = token_payload.get("page_id") or account.page_id
    account.save()
    return account


def disconnect_social_account(account: SocialAccount) -> SocialAccount:
    account.is_connected = False
    account.connected_at = None
    account.save(update_fields=["is_connected", "connected_at", "updated_at"])
    return account


def ensure_portal_tracking_code(portal: VisitorTrackingPortal, *, app_name: str, defaults: dict[str, Any] | None = None):
    tracking_code = build_tracking_code(portal.id or 0, portal.portal_name)
    setting, created = VisitorTrackingSetting.objects.get_or_create(
        portal=portal,
        defaults={
            "app_name": app_name,
            "tracking_code": tracking_code,
            **(defaults or {}),
        },
    )
    if not created and setting.tracking_code != tracking_code:
        setting.tracking_code = tracking_code
        setting.app_name = app_name or setting.app_name
        setting.save(update_fields=["tracking_code", "app_name", "updated_at"])
    return setting


def _lead_from_message_payload(payload: dict[str, Any], owner=None) -> MatchedCRMRecord:
    email_addresses = [payload.get("from_email"), *(payload.get("to_emails") or []), *(payload.get("cc_emails") or [])]
    reference_text = " ".join(
        [
            payload.get("subject") or "",
            payload.get("thread_id") or "",
            payload.get("body_text") or "",
            payload.get("body_html") or "",
        ]
    ).strip()
    for email in email_addresses:
        match = match_crm_records(email=email, text=reference_text)
        if match.contact or match.lead or match.account or match.deal or match.support_case:
            return match

    lead = get_or_create_placeholder_lead(
        email=payload.get("from_email"),
        name=payload.get("from_name") or payload.get("subject"),
        company=payload.get("company") or "Email Prospect",
        owner=owner,
    )
    return MatchedCRMRecord(lead=lead)


def save_synced_message(
    *,
    provider_integration: EmailProviderIntegration,
    payload: dict[str, Any],
    owner=None,
) -> SyncedEmailMessage:
    return create_synced_email_message(
        provider_integration=provider_integration,
        payload=payload,
        owner=owner,
    )


@transaction.atomic
def create_synced_email_message(
    *,
    provider_integration: EmailProviderIntegration,
    payload: dict[str, Any],
    owner=None,
) -> SyncedEmailMessage:
    match = _lead_from_message_payload(payload, owner=owner)
    logger.info(
        "Saving synced email for provider=%s external_message_id=%s matched_lead=%s",
        provider_integration.pk,
        payload["external_message_id"],
        getattr(match.lead, "pk", None),
    )
    message, _ = SyncedEmailMessage.objects.update_or_create(
        provider_integration=provider_integration,
        external_message_id=payload["external_message_id"],
        defaults={
            "thread_id": payload.get("thread_id"),
            "subject": payload.get("subject") or "(No subject)",
            "from_email": normalize_email(payload.get("from_email")) or make_placeholder_email("mail"),
            "to_emails": [normalize_email(email) for email in payload.get("to_emails", []) if normalize_email(email)],
            "cc_emails": [normalize_email(email) for email in payload.get("cc_emails", []) if normalize_email(email)],
            "bcc_emails": [normalize_email(email) for email in payload.get("bcc_emails", []) if normalize_email(email)],
            "body_text": payload.get("body_text"),
            "body_html": payload.get("body_html"),
            "direction": payload.get("direction") or SyncedEmailMessage.Direction.INCOMING,
            "status": payload.get("status") or SyncedEmailMessage.Status.RECEIVED,
            "received_at": payload.get("received_at") or timezone.now(),
            "sent_at": payload.get("sent_at"),
            "is_read": bool(payload.get("is_read", False)),
            "is_starred": bool(payload.get("is_starred", False)),
            "has_attachments": bool(payload.get("has_attachments", False)),
            "lead": match.lead,
            "contact": match.contact,
            "account": match.account,
            "deal": match.deal,
            "support_case": match.support_case,
        },
    )
    create_source_event(
        source_type=IntegrationLeadSourceEvent.SourceType.EMAIL,
        source_reference=message.external_message_id,
        payload=payload,
        status="processed",
        lead=message.lead,
        contact=message.contact,
        account=message.account,
        deal=message.deal,
        support_case=message.support_case,
    )
    return message


def mocked_provider_messages(provider: EmailProviderIntegration) -> list[dict[str, Any]]:
    now = timezone.now()
    leads = list(Lead.objects.order_by("id")[:3])
    if not leads:
        logger.info("Provider %s sync has no existing leads to match against; generating fallback mock payload.", provider.pk)
        return [
            {
                "external_message_id": f"{provider.pk}-fallback",
                "thread_id": f"thread-{provider.pk}-fallback",
                "subject": "Zora integration follow-up",
                "from_email": "prospect@example.com",
                "to_emails": [provider.email_address],
                "cc_emails": [],
                "bcc_emails": [],
                "body_text": "Testing synced email storage for Zora CRM.",
                "direction": SyncedEmailMessage.Direction.INCOMING,
                "status": SyncedEmailMessage.Status.RECEIVED,
                "received_at": now - timedelta(minutes=15),
                "is_read": False,
                "has_attachments": False,
            }
        ]

    payloads: list[dict[str, Any]] = []
    for index, lead in enumerate(leads, start=1):
        lead_email = normalize_email(lead.email)
        if not lead_email:
            continue
        payloads.append(
            {
                "external_message_id": f"{provider.pk}-lead-{lead.pk}-incoming",
                "thread_id": f"thread-{provider.pk}-lead-{lead.pk}",
                "subject": f"Zora integration follow-up for {lead.first_name}",
                "from_email": lead_email,
                "to_emails": [provider.email_address],
                "cc_emails": [],
                "bcc_emails": [],
                "body_text": f"Hello Zora team, this is a synced email for lead {lead.pk}.",
                "body_html": f"<p>Hello Zora team, this is a synced email for lead <strong>{lead.pk}</strong>.</p>",
                "direction": SyncedEmailMessage.Direction.INCOMING,
                "status": SyncedEmailMessage.Status.RECEIVED,
                "received_at": now - timedelta(hours=index),
                "is_read": False,
                "has_attachments": False,
                "from_name": f"{lead.first_name} {lead.last_name}".strip(),
                "company": lead.company,
            }
        )
    return payloads


def fetch_provider_messages(provider_integration: EmailProviderIntegration) -> list[dict[str, Any]]:
    logger.info("Fetching provider messages for provider=%s email=%s", provider_integration.pk, provider_integration.email_address)
    return mocked_provider_messages(provider_integration)


@transaction.atomic
def run_provider_sync(*, provider_integration: EmailProviderIntegration, sync_type: str, triggered_by=None) -> EmailSyncLog:
    log = EmailSyncLog.objects.create(
        provider_integration=provider_integration,
        sync_type=sync_type,
        status=EmailSyncLog.Status.RUNNING,
        metadata={"triggered_by": getattr(triggered_by, "id", None)},
    )
    try:
        if provider_integration.token_expiry and provider_integration.token_expiry <= timezone.now():
            raise ValueError("Provider token has expired. Refresh the connection and retry.")
        logger.info("Starting provider sync provider=%s sync_type=%s", provider_integration.pk, sync_type)
        created_ids = []
        messages = fetch_provider_messages(provider_integration)
        for payload in messages:
            message = save_synced_message(
                provider_integration=provider_integration,
                payload=payload,
                owner=provider_integration.created_by,
            )
            created_ids.append(message.id)
        log.status = EmailSyncLog.Status.SUCCESS
        log.last_synced_at = timezone.now()
        log.metadata = {
            **log.metadata,
            "message_ids": created_ids,
            "messages_processed": len(created_ids),
            "lead_matches": SyncedEmailMessage.objects.filter(id__in=created_ids, lead__isnull=False).count(),
        }
        provider_integration.sync_enabled = True
        provider_integration.save(update_fields=["sync_enabled", "updated_at"])
        logger.info("Provider sync completed provider=%s messages_processed=%s", provider_integration.pk, len(created_ids))
    except Exception as exc:
        logger.exception("Provider sync failed provider=%s", provider_integration.pk)
        log.status = EmailSyncLog.Status.FAILED
        log.error_message = str(exc)
        raise
    finally:
        log.save()
    return log


@transaction.atomic
def ingest_parser_message(*, parser_inbox: EmailParserInbox, payload: dict[str, Any], user=None):
    target_type = payload.get("create_record_type") or parser_inbox.create_record_type
    contact_email = normalize_email(payload.get("email") or payload.get("from_email"))
    contact_name = payload.get("name") or payload.get("from_name") or payload.get("subject")
    company = payload.get("company") or "Parsed Inbox"

    lead = None
    contact = None
    support_case = None

    if target_type == EmailParserInbox.RecordType.CONTACT:
        contact = get_or_create_contact_from_event(email=contact_email, name=contact_name, owner=user)
    elif target_type == EmailParserInbox.RecordType.CASE:
        support_case = SupportCase.objects.create(
            subject=payload.get("subject") or "Parsed support request",
            description=payload.get("body_text") or payload.get("body_html"),
            email=contact_email,
            company=company,
            reported_by=contact_name,
            owner=user,
            created_by=user,
            updated_by=user,
            case_origin="Email Parser",
            lead_source="Integration",
        )
    else:
        lead = get_or_create_placeholder_lead(email=contact_email, name=contact_name, company=company, owner=user)

    event = create_source_event(
        source_type=IntegrationLeadSourceEvent.SourceType.PARSER,
        source_reference=parser_inbox.parser_email_address,
        payload=payload,
        status="processed",
        lead=lead,
        contact=contact,
        account=getattr(contact, "account", None),
        support_case=support_case,
    )
    return {"lead": lead, "contact": contact, "support_case": support_case, "event": event}


@transaction.atomic
def process_bcc_payload(*, setting: BCCDropboxSetting, payload: dict[str, Any], user=None):
    from_email = normalize_email(payload.get("from_email"))
    if not from_email:
        raise ValueError("from_email is required for BCC processing.")
    excluded_domains = {domain.lower() for domain in setting.exclude_domains}
    if from_email.split("@")[-1] in excluded_domains:
        raise ValueError("This sender domain is excluded from BCC matching.")

    match = match_crm_records_by_email(from_email)
    lead = match.lead
    if not match.contact and not lead:
        lead = get_or_create_placeholder_lead(
            email=from_email,
            name=payload.get("from_name") or payload.get("subject"),
            company=payload.get("company") or "BCC Dropbox",
            owner=user,
        )
    event = create_source_event(
        source_type=IntegrationLeadSourceEvent.SourceType.BCC_DROPBOX,
        source_reference=setting.dropbox_email_address,
        payload=payload,
        status="processed",
        lead=lead or match.lead,
        contact=match.contact,
        account=match.account,
        deal=match.deal,
        support_case=match.support_case,
    )
    return {
        "lead": lead or match.lead,
        "contact": match.contact,
        "account": match.account,
        "deal": match.deal,
        "event": event,
    }


def _should_create_case_from_social(message: str, action_type: str | None) -> bool:
    text = (message or "").lower()
    return action_type == SocialLeadAutomationRule.ActionType.CREATE_CASE or any(keyword in text for keyword in COMPLAINT_KEYWORDS)


@transaction.atomic
def ingest_social_message(*, payload: dict[str, Any], user=None) -> SocialMessage:
    platform = payload["platform"]
    text = payload.get("message") or ""
    sender_email = normalize_email(payload.get("sender_email"))
    sender_phone = payload.get("sender_phone")
    sender_name = payload.get("sender_name")
    profile_handle = payload.get("profile_handle")
    external_message_id = payload.get("external_message_id")
    brand = payload.get("brand")
    social_account = payload.get("social_account")

    reference_text = " ".join(filter(None, [text, profile_handle, payload.get("subject")])).strip()
    match = match_crm_records(email=sender_email, phone=sender_phone, text=reference_text)

    rule = (
        SocialLeadAutomationRule.objects.filter(platform=platform, is_active=True)
        .order_by("-updated_at")
        .first()
    )
    owner = getattr(rule, "assign_to_user", None) or user
    lead = match.lead
    contact = match.contact
    account = match.account
    deal = match.deal
    support_case = match.support_case

    if not lead and not contact and rule and rule.action_type == SocialLeadAutomationRule.ActionType.CREATE_LEAD:
        lead = get_or_create_placeholder_lead(
            email=sender_email,
            name=sender_name or profile_handle or f"{platform.title()} Social Prospect",
            company="Social Prospect",
            owner=owner,
        )

    if not support_case and _should_create_case_from_social(text, getattr(rule, "action_type", None)):
        support_case = SupportCase.objects.create(
            subject=(text[:120] or "Social support request"),
            description=text,
            email=sender_email,
            phone=sender_phone,
            reported_by=sender_name or profile_handle,
            owner=owner,
            created_by=user,
            updated_by=user,
            related_contact=contact,
            account=account,
            deal=deal,
            case_origin=f"{platform.title()} Social",
            case_reason="Product Issue",
            status="Open",
            priority="Medium",
            company=getattr(account, "account_name", None) or "Social Prospect",
        )

    defaults = {
        "brand": brand,
        "social_account": social_account,
        "profile_handle": profile_handle,
        "sender_name": sender_name,
        "sender_email": sender_email,
        "sender_phone": sender_phone,
        "message": text,
        "created_at_source": payload.get("created_at_source") or timezone.now(),
        "payload": _json_safe(payload),
        "lead": lead,
        "contact": contact,
        "account": account,
        "deal": deal,
        "support_case": support_case,
    }
    if external_message_id:
        message, _ = SocialMessage.objects.update_or_create(
            platform=platform,
            external_message_id=external_message_id,
            defaults=defaults,
        )
    else:
        message = SocialMessage.objects.create(
            platform=platform,
            external_message_id=None,
            **defaults,
        )
    create_source_event(
        source_type=IntegrationLeadSourceEvent.SourceType.SOCIAL,
        source_reference=external_message_id or f"{platform}-{message.pk}",
        payload={
            **payload,
            "source_label": sender_name or profile_handle or platform.title(),
        },
        status="processed",
        lead=lead,
        contact=contact,
        account=account,
        deal=deal,
        support_case=support_case,
    )
    return message


@transaction.atomic
def convert_visitor_event(*, visitor_event: VisitorLeadEvent, user=None):
    if visitor_event.converted_to_lead and (visitor_event.linked_lead or visitor_event.linked_contact):
        return {"lead": visitor_event.linked_lead, "contact": visitor_event.linked_contact}

    setting = getattr(visitor_event.portal, "setting", None)
    owner = setting.assign_lead_to_user if setting and setting.assign_lead_to_user else user
    matched = match_crm_records(
        email=visitor_event.identified_email or visitor_event.visitor_email,
        text=" ".join(filter(None, [visitor_event.page_url, visitor_event.source_url, visitor_event.referrer])),
    )
    if setting and setting.push_new_visitors_as == VisitorTrackingSetting.PushAs.CONTACT:
        contact = matched.contact or get_or_create_contact_from_event(
            email=visitor_event.identified_email or visitor_event.visitor_email,
            name=visitor_event.visitor_name,
            owner=owner,
            account=matched.account,
        )
        visitor_event.linked_contact = contact
        visitor_event.converted_to_lead = True
        visitor_event.save(update_fields=["linked_contact", "converted_to_lead", "updated_at"])
        event = create_source_event(
            source_type=IntegrationLeadSourceEvent.SourceType.WEBSITE,
            source_reference=f"visitor-event-{visitor_event.id}",
            payload={"portal_id": visitor_event.portal_id, "event_type": visitor_event.event_type, "page_url": visitor_event.page_url or visitor_event.source_url},
            status="converted",
            contact=contact,
            account=contact.account,
            deal=matched.deal,
            support_case=matched.support_case,
        )
        return {"lead": None, "contact": contact, "event": event}

    lead = matched.lead or get_or_create_placeholder_lead(
        email=visitor_event.identified_email or visitor_event.visitor_email,
        name=visitor_event.visitor_name,
        company=urlparse(visitor_event.page_url or visitor_event.source_url or visitor_event.portal.portal_url).netloc or "Website Visitor",
        owner=owner,
    )
    visitor_event.converted_to_lead = True
    visitor_event.linked_lead = lead
    visitor_event.linked_contact = matched.contact
    visitor_event.save(update_fields=["converted_to_lead", "linked_lead", "linked_contact", "updated_at"])
    event = create_source_event(
        source_type=IntegrationLeadSourceEvent.SourceType.SALESIQ,
        source_reference=f"visitor-event-{visitor_event.id}",
        payload={"portal_id": visitor_event.portal_id, "event_type": visitor_event.event_type, "page_url": visitor_event.page_url or visitor_event.source_url},
        status="converted",
        lead=lead,
        contact=matched.contact,
        account=matched.account,
        deal=matched.deal,
        support_case=matched.support_case,
    )
    return {"lead": lead, "contact": matched.contact, "event": event}


@transaction.atomic
def create_visitor_event(*, payload: dict[str, Any], user=None):
    portal = payload["portal"]
    visitor_email = normalize_email(payload.get("visitor_email"))
    identified_email = normalize_email(payload.get("identified_email")) or visitor_email
    visitor_name = payload.get("visitor_name")
    page_url = payload.get("page_url") or payload.get("source_url")
    source_url = payload.get("source_url") or page_url
    referrer = payload.get("referrer")
    session_id = payload.get("session_id")
    page_history = payload.get("page_history") or []
    time_spent_seconds = payload.get("time_spent_seconds")
    event_type = payload.get("event_type") or "visit"

    matched = match_crm_records(
        email=identified_email,
        phone=payload.get("phone"),
        text=" ".join(filter(None, [page_url, referrer, payload.get("source_reference")])),
    )
    linked_lead = matched.lead
    linked_contact = matched.contact
    event = VisitorLeadEvent.objects.create(
        portal=portal,
        session_id=session_id,
        visitor_name=visitor_name,
        visitor_email=visitor_email,
        identified_email=identified_email,
        page_url=page_url,
        source_url=source_url,
        referrer=referrer,
        page_history=page_history,
        time_spent_seconds=time_spent_seconds,
        event_type=event_type,
        linked_lead=linked_lead,
        linked_contact=linked_contact,
        converted_to_lead=bool(linked_lead or linked_contact),
    )
    if session_id and identified_email:
        VisitorLeadEvent.objects.filter(
            session_id=session_id,
            identified_email__isnull=True,
        ).exclude(pk=event.pk).update(
            identified_email=identified_email,
            linked_lead=linked_lead,
            linked_contact=linked_contact,
            converted_to_lead=bool(linked_lead or linked_contact),
            updated_at=timezone.now(),
        )
    source_event = create_source_event(
        source_type=IntegrationLeadSourceEvent.SourceType.WEBSITE,
        source_reference=payload.get("source_reference") or f"visitor-event-{event.pk}",
        payload={
            "portal_id": portal.pk,
            "source_label": payload.get("source_label") or payload.get("source_reference") or event_type,
            "page_url": page_url,
            "source_url": source_url,
            "referrer": referrer,
            "page_history": page_history,
            "event_type": event_type,
        },
        status="linked" if linked_lead or linked_contact else "captured",
        lead=linked_lead,
        contact=linked_contact,
        account=matched.account,
        deal=matched.deal,
        support_case=matched.support_case,
    )
    high_intent = any(keyword in (page_url or "").lower() for keyword in HIGH_INTENT_PATH_KEYWORDS)
    repeated_visit = bool(
        identified_email
        and VisitorLeadEvent.objects.filter(portal=portal, identified_email=identified_email).exclude(pk=event.pk).count() >= 1
    )
    should_convert = event_type.lower() in {"form_submit", "signup", "contact"} or repeated_visit or high_intent
    if should_convert and not (linked_lead or linked_contact):
        convert_visitor_event(visitor_event=event, user=user)
    logger.info(
        "Created visitor event portal=%s visitor_email=%s linked_lead=%s source_event=%s",
        portal.pk,
        identified_email or visitor_email,
        getattr(linked_lead, "pk", None),
        source_event.pk,
    )
    event.refresh_from_db()
    return {"visitor_event": event, "source_event": source_event, "lead": event.linked_lead, "contact": event.linked_contact}


@transaction.atomic
def link_visitor_event_to_lead(*, visitor_event: VisitorLeadEvent, lead: Lead | None = None, user=None):
    target_lead = lead or match_crm_records(email=visitor_event.identified_email or visitor_event.visitor_email).lead
    if not target_lead:
        result = convert_visitor_event(visitor_event=visitor_event, user=user)
        target_lead = result.get("lead")
    else:
        visitor_event.linked_lead = target_lead
        visitor_event.converted_to_lead = True
        visitor_event.save(update_fields=["linked_lead", "converted_to_lead", "updated_at"])
        create_source_event(
            source_type=IntegrationLeadSourceEvent.SourceType.WEBSITE,
            source_reference=f"visitor-event-{visitor_event.pk}",
            payload={"portal_id": visitor_event.portal_id, "source_label": visitor_event.event_type, "source_url": visitor_event.source_url, "page_url": visitor_event.page_url},
            status="linked",
            lead=target_lead,
            contact=visitor_event.linked_contact,
        )
    logger.info("Linked visitor event=%s to lead=%s", visitor_event.pk, getattr(target_lead, "pk", None))
    return target_lead


def build_sales_inbox_queryset(user):
    queryset = SyncedEmailMessage.objects.select_related(
        "lead",
        "contact",
        "account",
        "deal",
        "support_case",
        "provider_integration",
    )
    if not is_integration_admin(user):
        queryset = queryset.filter(provider_integration__created_by=user)

    return queryset.annotate(
        priority_rank=Case(
            When(is_read=False, then=Value(0)),
            When(is_starred=True, then=Value(1)),
            default=Value(2),
            output_field=IntegerField(),
        ),
        thread_size=Count("id"),
    ).order_by("priority_rank", "-received_at", "-created_at")


def build_credibility_report():
    return {
        "total_sent": 0,
        "delivered_count": 0,
        "bounced_count": 0,
        "spam_complaints": 0,
        "average_score": 0,
        "active_relays": list(
            EmailRelayServer.objects.filter(is_active=True)
            .values("domain_name")
            .annotate(active_relays=Count("id"))
        ),
    }
