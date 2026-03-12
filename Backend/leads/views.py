from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from activities.serializers import LeadActivitySerializer
from activities.models import LeadActivity
from notes.serializers import LeadNoteSerializer
from notes.models import LeadNote

from .filters import LeadFilter
from .models import Lead
from .pagination import LeadPagination
from .serializers import (
    LeadActionSerializer,
    LeadCallSerializer,
    LeadCloneResponseSerializer,
    LeadConvertRequestSerializer,
    LeadConvertResponseSerializer,
    LeadDetailSerializer,
    LeadListSerializer,
    LeadMeetingSerializer,
    LeadNoteCreateSerializer,
    LeadSendEmailSerializer,
)
from .services import (
    bulk_delete_leads,
    clone_lead,
    convert_lead,
    create_note_for_lead,
    create_activity_log,
    get_lead_timeline,
    list_lead_notes,
)


class LeadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = LeadPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = LeadFilter
    search_fields = ["first_name", "last_name", "company", "email", "phone"]
    ordering_fields = [
        "created_at",
        "company",
        "first_name",
        "annual_revenue",
        "employee_count",
    ]

    def get_queryset(self):
        return (
            Lead.objects.select_related("owner")
            .prefetch_related(
                Prefetch(
                    "activities",
                    queryset=LeadActivity.objects.select_related("user"),
                ),
                Prefetch(
                    "notes",
                    queryset=LeadNote.objects.select_related("created_by"),
                ),
            )
            .all()
        )

    def get_serializer_class(self):
        if self.action == "list":
            return LeadListSerializer
        if self.action == "timeline":
            return LeadActivitySerializer
        if self.action == "notes" and self.request.method == "POST":
            return LeadNoteCreateSerializer
        if self.action == "notes":
            return LeadNoteSerializer
        if self.action == "create_task":
            return LeadActionSerializer
        if self.action == "log_call":
            return LeadCallSerializer
        if self.action == "schedule_meeting":
            return LeadMeetingSerializer
        if self.action == "send_email":
            return LeadSendEmailSerializer
        if self.action == "convert":
            return LeadConvertRequestSerializer
        return LeadDetailSerializer

    def perform_create(self, serializer):
        lead = serializer.save()
        create_activity_log(
            lead=lead,
            action="Lead Created",
            description="Lead record created.",
            user=self.request.user,
        )

    def perform_update(self, serializer):
        lead = serializer.save()
        create_activity_log(
            lead=lead,
            action="Lead Updated",
            description="Lead record updated.",
            user=self.request.user,
        )

    @swagger_auto_schema(
        operation_description="Deletes a list of leads by their IDs.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["ids"],
            properties={
                "ids": openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(type=openapi.TYPE_INTEGER),
                    description="List of lead IDs to delete.",
                ),
            },
        ),
        responses={
            200: openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "message": openapi.Schema(type=openapi.TYPE_STRING),
                    "deleted_count": openapi.Schema(type=openapi.TYPE_INTEGER),
                },
            ),
            400: "Bad Request",
        },
    )
    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        if not ids or not isinstance(ids, list):
            return Response(
                {"error": "Please provide a valid list of 'ids'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count = bulk_delete_leads(ids)
        return Response(
            {
                "message": f"Successfully deleted {deleted_count} leads.",
                "deleted_count": deleted_count,
            },
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        method="post",
        operation_description="Clone an existing lead into a new lead record.",
        responses={201: LeadCloneResponseSerializer},
    )
    @action(detail=True, methods=["post"], url_path="clone")
    def clone(self, request, pk=None):
        lead = self.get_object()
        cloned_lead = clone_lead(lead=lead, user=request.user)
        return Response(
            {
                "message": "Lead cloned successfully",
                "lead_id": cloned_lead.pk,
            },
            status=status.HTTP_201_CREATED,
        )

    @swagger_auto_schema(
        method="get",
        operation_description="Fetch the full activity timeline for a lead.",
        responses={
            200: LeadActivitySerializer(many=True),
            404: "Lead not found",
        },
    )
    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadActivitySerializer(get_lead_timeline(lead=lead), many=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        method="get",
        operation_description="Fetch all notes for a lead.",
        responses={
            200: LeadNoteSerializer(many=True),
            404: "Lead not found",
        },
    )
    @swagger_auto_schema(
        method="post",
        operation_description="Create a note for a lead.",
        request_body=LeadNoteCreateSerializer,
        responses={
            201: LeadNoteSerializer,
            400: "Validation error",
            404: "Lead not found",
        },
    )
    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        lead = self.get_object()
        if request.method == "GET":
            serializer = LeadNoteSerializer(list_lead_notes(lead=lead), many=True)
            return Response(serializer.data)

        serializer = LeadNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = create_note_for_lead(
            lead=lead,
            note=serializer.validated_data["note"],
            user=request.user,
        )
        return Response(LeadNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        method="post",
        operation_description="Convert a lead into an account, a contact, and optionally a deal.",
        request_body=LeadConvertRequestSerializer,
        responses={200: LeadConvertResponseSerializer},
    )
    @action(detail=True, methods=["post"], url_path="convert")
    def convert(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadConvertRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        try:
            result = convert_lead(
                lead=lead,
                user=request.user,
                create_deal=serializer.validated_data.get("create_deal", False),
                deal_name=serializer.validated_data.get("deal_name"),
                deal_value=serializer.validated_data.get("deal_value"),
            )
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.messages[0]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Lead converted successfully",
                "account_id": result["account"].pk,
                "contact_id": result["contact"].pk,
                "deal_id": result["deal"].pk if result["deal"] else None,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="create-task")
    def create_task(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        create_activity_log(
            lead=lead,
            action="Task created",
            description=serializer.validated_data["subject"],
            user=request.user,
        )
        return Response({"message": "Task created successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="log-call")
    def log_call(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        description = serializer.validated_data["call_summary"]
        outcome = serializer.validated_data.get("call_outcome", "").strip()
        if outcome:
            description = f"{description} | {outcome}"

        create_activity_log(
            lead=lead,
            action="Call logged",
            description=description,
            user=request.user,
        )
        return Response({"message": "Call logged successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="schedule-meeting")
    def schedule_meeting(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadMeetingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        description = serializer.validated_data["meeting_subject"]
        agenda = serializer.validated_data.get("agenda", "").strip()
        if agenda:
            description = f"{description} | {agenda}"

        create_activity_log(
            lead=lead,
            action="Meeting scheduled",
            description=description,
            user=request.user,
        )
        return Response({"message": "Meeting scheduled successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="send-email")
    def send_email(self, request, pk=None):
        lead = self.get_object()
        serializer = LeadSendEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        create_activity_log(
            lead=lead,
            action="Email sent",
            description=serializer.validated_data["subject"],
            user=request.user,
        )
        return Response({"message": "Email logged successfully"}, status=status.HTTP_201_CREATED)
