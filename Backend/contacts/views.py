from django.core.exceptions import ObjectDoesNotExist, ValidationError as DjangoValidationError
from django.core.validators import EmailValidator
from django.http import Http404
import json
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import ContactFilter
from .permissions import ContactPermission
from .serializers import (
    ContactActionSerializer,
    ContactDetailSerializer,
    ContactListSerializer,
    ContactLogCallSerializer,
    ContactNoteCreateSerializer,
    ContactNoteSerializer,
    ContactSendEmailSerializer,
    ContactTimelineSerializer,
    ContactWriteSerializer,
    PHONE_PATTERN,
)
from .services import contact_service
from .models import Contact
from accounts.models import Account
from leads.models import Lead


class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ContactPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ContactFilter
    search_fields = [
        "first_name",
        "last_name",
        "email",
        "phone",
        "mobile",
        "account__account_name",
    ]
    ordering_fields = ["created_at", "updated_at", "first_name", "last_name", "email"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = contact_service.list_contacts(user=self.request.user)
        sort = self.request.query_params.get("sort")
        if sort:
            allowed = set(self.ordering_fields)
            normalized = sort[1:] if sort.startswith("-") else sort
            if normalized in allowed:
                queryset = queryset.order_by(sort)
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return ContactListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return ContactWriteSerializer
        if self.action == "timeline":
            return ContactTimelineSerializer
        if self.action == "notes" and self.request.method == "POST":
            return ContactNoteCreateSerializer
        if self.action == "notes":
            return ContactNoteSerializer
        if self.action == "create_task":
            return ContactActionSerializer
        if self.action == "log_call":
            return ContactLogCallSerializer
        if self.action == "send_email":
            return ContactSendEmailSerializer
        return ContactDetailSerializer

    def create(self, request, *args, **kwargs):
        if isinstance(request.data, list) or "records" in request.data:
            return self.import_records(request)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = contact_service.create_contact(data=serializer.validated_data, user=request.user)
        response_serializer = ContactDetailSerializer(contact, context=self.get_serializer_context())
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        try:
            contact = contact_service.get_contact_detail(contact_id=kwargs["pk"], user=request.user)
        except ObjectDoesNotExist as exc:
            raise Http404 from exc
        self.check_object_permissions(request, contact)
        serializer = self.get_serializer(contact)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        contact = self.get_object()
        serializer = self.get_serializer(contact, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = contact_service.update_contact(
            contact=contact,
            data=serializer.validated_data,
            user=request.user,
        )
        response_serializer = ContactDetailSerializer(updated, context=self.get_serializer_context())
        return Response(response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        contact = self.get_object()
        contact_service.delete_contact(contact=contact, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="import")
    def import_records(self, request):
        payload = request.data.get("records", request.data)
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                pass
        if isinstance(payload, dict):
            payload = [payload]
        if not isinstance(payload, list):
            return Response(
                {
                    "message": "Contacts import completed.",
                    "total": 0,
                    "imported_count": 0,
                    "skipped_count": 0,
                    "error_count": 1,
                    "errors": [{"row": 0, "errors": {"records": ["Expected a list of records."]}}],
                },
                status=status.HTTP_200_OK,
            )

        if len(payload) == 0:
            return Response(
                {
                    "message": "Contacts import completed.",
                    "total": 0,
                    "imported_count": 0,
                    "skipped_count": 0,
                    "error_count": 1,
                    "errors": [{"row": 0, "errors": {"records": ["No records provided."]}}],
                },
                status=status.HTTP_200_OK,
            )

        if len(payload) > 5000:
            return Response(
                {"detail": "CSV exceeds the limit of 5000 records."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_fields = set(ContactWriteSerializer.Meta.fields)
        allowed_fields.update({"account_name"})
        invalid_columns = sorted(
            {key for row in payload if isinstance(row, dict) for key in row.keys()} - allowed_fields
        )

        errors = []
        normalized_records = []
        seen_emails = set()
        validate_email = EmailValidator()

        for index, row in enumerate(payload, start=1):
            if not isinstance(row, dict):
                errors.append({"row": index, "errors": {"row": ["Row data is invalid."]}})
                continue

            normalized = {}
            for key, value in row.items():
                if key not in allowed_fields:
                    continue
                if value is None:
                    continue
                if isinstance(value, str):
                    value = value.strip()
                    if value == "":
                        continue
                if key in {"email", "secondary_email"} and isinstance(value, str):
                    value = value.lower()
                normalized[key] = value

            if not normalized:
                errors.append({"row": index, "errors": {"row": ["Row is empty."]}})
                continue

            if not normalized.get("first_name") or not normalized.get("last_name"):
                errors.append(
                    {"row": index, "errors": {"name": ["first_name and last_name are required."]}}
                )
                continue

            if normalized.get("account_name") and not normalized.get("account"):
                account = Account.objects.filter(
                    account_name__iexact=str(normalized["account_name"]).strip()
                ).first()
                if not account:
                    errors.append(
                        {
                            "row": index,
                            "errors": {"account_name": ["Account not found."]},
                        }
                    )
                    continue
                normalized["account"] = account.id
            if normalized.get("account_name"):
                normalized.pop("account_name", None)

            if normalized.get("created_from_lead") and isinstance(normalized["created_from_lead"], str):
                lead = Lead.objects.filter(email__iexact=normalized["created_from_lead"]).first()
                if lead:
                    normalized["created_from_lead"] = lead.id

            email = normalized.get("email")
            if email:
                try:
                    validate_email(email)
                except DjangoValidationError:
                    errors.append({"row": index, "errors": {"email": ["Invalid email format."]}})
                    continue
                if email in seen_emails:
                    errors.append({"row": index, "errors": {"email": ["Duplicate email in file."]}})
                    continue
                seen_emails.add(email)

            phone_values = [
                normalized.get("phone"),
                normalized.get("mobile"),
                normalized.get("other_phone"),
                normalized.get("home_phone"),
                normalized.get("assistant_phone"),
            ]
            if not email and not any(phone_values):
                errors.append(
                    {"row": index, "errors": {"contact": ["Email or phone is required."]}}
                )
                continue

            for field_name in [
                "phone",
                "mobile",
                "other_phone",
                "home_phone",
                "assistant_phone",
            ]:
                value = normalized.get(field_name)
                if value and not PHONE_PATTERN.match(str(value)):
                    errors.append({"row": index, "errors": {field_name: ["Invalid phone number."]}})
                    value = None
                    break
            if errors and errors[-1]["row"] == index:
                continue

            serializer = ContactWriteSerializer(data=normalized, context={"request": request})
            if not serializer.is_valid():
                errors.append({"row": index, "errors": serializer.errors})
                continue
            record = serializer.validated_data
            if not record.get("contact_owner"):
                record["contact_owner"] = request.user
            normalized_records.append(record)

        if invalid_columns:
            errors.append({"row": 0, "errors": {"invalid_columns": invalid_columns}})

        existing_emails = set()
        if seen_emails:
            existing_emails = set(
                Contact.objects.filter(email__in=seen_emails, is_active=True).values_list(
                    "email", flat=True
                )
            )

        valid_records = []
        skipped_count = 0
        for index, data in enumerate(normalized_records, start=1):
            email = data.get("email")
            if email and email in existing_emails:
                errors.append({"row": index, "errors": {"email": ["Email already exists."]}})
                skipped_count += 1
                continue
            valid_records.append(data)

        created_count = 0
        if valid_records:
            with transaction.atomic():
                contacts = [Contact(**record) for record in valid_records]
                Contact.objects.bulk_create(contacts, batch_size=500)
                created_count = len(contacts)

        return Response(
            {
                "message": "Contacts import completed.",
                "total": len(payload),
                "imported_count": created_count,
                "skipped_count": skipped_count,
                "error_count": len(errors),
                "errors": errors,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        contact = self.get_object()
        serializer = ContactTimelineSerializer(
            contact_service.timeline_service.list_events(contact=contact),
            many=True,
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        contact = self.get_object()
        if request.method == "GET":
            serializer = ContactNoteSerializer(
                contact_service.notes_service.list_notes(contact=contact),
                many=True,
            )
            return Response(serializer.data)

        serializer = ContactNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = contact_service.notes_service.create_note(
            contact=contact,
            note=serializer.validated_data["note"],
            user=request.user,
        )
        contact_service.log_activity(
            contact=contact,
            action="Notes added",
            description="Note added to contact",
            user=request.user,
        )
        return Response(ContactNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="create-task")
    def create_task(self, request, pk=None):
        contact = self.get_object()
        serializer = ContactActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.validated_data["subject"]

        contact_service.log_activity(
            contact=contact,
            action="Task created",
            description=subject,
            user=request.user,
        )
        return Response({"message": "Task created successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="log-call")
    def log_call(self, request, pk=None):
        contact = self.get_object()
        serializer = ContactLogCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        call_summary = serializer.validated_data["call_summary"]
        call_outcome = serializer.validated_data.get("call_outcome", "").strip()
        description = call_summary if not call_outcome else f"{call_summary} | {call_outcome}"

        contact_service.log_activity(
            contact=contact,
            action="Call logged",
            description=description,
            user=request.user,
        )
        return Response({"message": "Call logged successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="send-email")
    def send_email(self, request, pk=None):
        contact = self.get_object()
        serializer = ContactSendEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = serializer.validated_data["subject"]

        contact_service.log_activity(
            contact=contact,
            action="Email sent",
            description=subject,
            user=request.user,
        )
        return Response({"message": "Email logged successfully"}, status=status.HTTP_201_CREATED)
