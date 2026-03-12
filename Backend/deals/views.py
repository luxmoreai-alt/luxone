from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import DealFilter
from .permissions import DealPermission
from .serializers import (
    DealActionSerializer,
    DealCallSerializer,
    DealDetailSerializer,
    DealListSerializer,
    DealMassDeleteSerializer,
    DealMassUpdateSerializer,
    DealMeetingSerializer,
    DealNoteCreateSerializer,
    DealNoteSerializer,
    DealStageUpdateSerializer,
    DealTimelineSerializer,
    DealWriteSerializer,
)
from .services import deal_service


class DealViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, DealPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = DealFilter
    search_fields = ["deal_name", "account__account_name", "contact__first_name", "contact__last_name"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "deal_name",
        "amount",
        "expected_revenue",
        "closing_date",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = deal_service.list_deals(user=self.request.user)
        sort = self.request.query_params.get("sort")
        if sort:
            allowed = set(self.ordering_fields)
            normalized = sort[1:] if sort.startswith("-") else sort
            if normalized in allowed:
                queryset = queryset.order_by(sort)
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return DealListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return DealWriteSerializer
        if self.action == "stage":
            return DealStageUpdateSerializer
        if self.action == "mass_delete":
            return DealMassDeleteSerializer
        if self.action == "mass_update":
            return DealMassUpdateSerializer
        if self.action == "notes" and self.request.method == "POST":
            return DealNoteCreateSerializer
        if self.action == "notes":
            return DealNoteSerializer
        if self.action == "timeline":
            return DealTimelineSerializer
        if self.action == "create_task":
            return DealActionSerializer
        if self.action == "log_call":
            return DealCallSerializer
        if self.action == "schedule_meeting":
            return DealMeetingSerializer
        return DealDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deal = deal_service.create_deal(data=serializer.validated_data, user=request.user)
        return Response(DealDetailSerializer(deal).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        try:
            deal = deal_service.get_deal_detail(deal_id=kwargs["pk"], user=request.user)
        except ObjectDoesNotExist as exc:
            raise Http404 from exc
        self.check_object_permissions(request, deal)
        return Response(DealDetailSerializer(deal).data)

    def partial_update(self, request, *args, **kwargs):
        deal = self.get_object()
        serializer = self.get_serializer(deal, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = deal_service.update_deal(deal=deal, data=serializer.validated_data, user=request.user)
        return Response(DealDetailSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        deal = self.get_object()
        deal_service.delete_deal(deal=deal, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="pipeline")
    def pipeline(self, request):
        return Response(deal_service.get_pipeline(user=request.user))

    @action(detail=True, methods=["patch"], url_path="stage")
    def stage(self, request, pk=None):
        deal = self.get_object()
        serializer = DealStageUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = deal_service.change_stage(
            deal=deal,
            stage=serializer.validated_data["stage"],
            user=request.user,
        )
        return Response(DealDetailSerializer(updated).data)

    @action(detail=False, methods=["post"], url_path="mass-delete")
    def mass_delete(self, request):
        serializer = DealMassDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deleted = deal_service.mass_delete(ids=serializer.validated_data["ids"], user=request.user)
        return Response({"message": f"{deleted} deals deleted.", "deleted_count": deleted})

    @action(detail=False, methods=["post"], url_path="mass-update")
    def mass_update(self, request):
        serializer = DealMassUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            updated_count = deal_service.mass_update(
                ids=serializer.validated_data["ids"],
                payload=serializer.validated_data["payload"],
                user=request.user,
            )
        except (ObjectDoesNotExist, ValueError):
            return Response(
                {"detail": "Invalid payload for mass update."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"message": f"{updated_count} deals updated.", "updated_count": updated_count})

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        csv_data = deal_service.export_deals(user=request.user)
        response = HttpResponse(csv_data, content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="deals_export.csv"'
        return response

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        deal = self.get_object()
        if request.method == "GET":
            return Response(DealNoteSerializer(deal_service.notes_service.list_notes(deal=deal), many=True).data)
        serializer = DealNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = deal_service.notes_service.create_note(
            deal=deal,
            note=serializer.validated_data["note"],
            user=request.user,
        )
        deal_service.log_activity(
            deal=deal,
            action="Notes added",
            description="Note added to deal",
            user=request.user,
        )
        return Response(DealNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        deal = self.get_object()
        return Response(
            DealTimelineSerializer(deal_service.timeline_service.list_events(deal=deal), many=True).data
        )

    @action(detail=True, methods=["post"], url_path="create-task")
    def create_task(self, request, pk=None):
        deal = self.get_object()
        serializer = DealActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        deal_service.log_activity(
            deal=deal,
            action="Task created",
            description=serializer.validated_data["subject"],
            user=request.user,
        )
        return Response({"message": "Task created successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="log-call")
    def log_call(self, request, pk=None):
        deal = self.get_object()
        serializer = DealCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        desc = serializer.validated_data["call_summary"]
        outcome = serializer.validated_data.get("call_outcome", "").strip()
        if outcome:
            desc = f"{desc} | {outcome}"
        deal_service.log_activity(
            deal=deal,
            action="Call logged",
            description=desc,
            user=request.user,
        )
        return Response({"message": "Call logged successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="schedule-meeting")
    def schedule_meeting(self, request, pk=None):
        deal = self.get_object()
        serializer = DealMeetingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        desc = serializer.validated_data["meeting_subject"]
        agenda = serializer.validated_data.get("agenda", "").strip()
        if agenda:
            desc = f"{desc} | {agenda}"
        deal_service.log_activity(
            deal=deal,
            action="Meeting scheduled",
            description=desc,
            user=request.user,
        )
        return Response({"message": "Meeting scheduled successfully"}, status=status.HTTP_201_CREATED)
