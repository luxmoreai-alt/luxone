from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404
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
)
from .services import contact_service


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
