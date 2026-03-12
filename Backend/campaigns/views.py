from django.core.exceptions import ObjectDoesNotExist
from django.http import Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import CampaignFilter
from .models import CampaignAttachment
from .permissions import CampaignPermission, can_access_campaign_owner
from .serializers import (
    CampaignActivityActionSerializer,
    CampaignAttachmentCreateSerializer,
    CampaignAttachmentSerializer,
    CampaignContactSerializer,
    CampaignCreateChildSerializer,
    CampaignDealSerializer,
    CampaignDetailSerializer,
    CampaignLeadSerializer,
    CampaignListSerializer,
    CampaignLogCallSerializer,
    CampaignNoteCreateSerializer,
    CampaignNoteSerializer,
    CampaignScheduleMeetingSerializer,
    CampaignStatsSerializer,
    CampaignTimelineSerializer,
    CampaignWriteSerializer,
)
from .services import campaign_service


class CampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CampaignPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CampaignFilter
    search_fields = ["campaign_name", "type", "status", "campaign_owner__email"]
    ordering_fields = ["created_at", "updated_at", "campaign_name", "start_date", "end_date"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = campaign_service.list_campaigns(user=self.request.user)
        sort = self.request.query_params.get("sort")
        if sort:
            allowed = set(self.ordering_fields)
            normalized = sort[1:] if sort.startswith("-") else sort
            if normalized in allowed:
                queryset = queryset.order_by(sort)
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return CampaignListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return CampaignWriteSerializer
        if self.action == "stats":
            return CampaignStatsSerializer
        if self.action in {"leads"}:
            return CampaignLeadSerializer
        if self.action in {"contacts"}:
            return CampaignContactSerializer
        if self.action in {"deals"}:
            return CampaignDealSerializer
        if self.action in {"activities", "timeline"}:
            return CampaignTimelineSerializer
        if self.action == "notes" and self.request.method == "POST":
            return CampaignNoteCreateSerializer
        if self.action == "notes":
            return CampaignNoteSerializer
        if self.action == "create_child":
            return CampaignCreateChildSerializer
        if self.action == "attachments" and self.request.method == "POST":
            return CampaignAttachmentCreateSerializer
        if self.action == "attachments":
            return CampaignAttachmentSerializer
        if self.action == "create_task":
            return CampaignActivityActionSerializer
        if self.action == "schedule_meeting":
            return CampaignScheduleMeetingSerializer
        if self.action == "log_call":
            return CampaignLogCallSerializer
        return CampaignDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign = campaign_service.create_campaign(data=serializer.validated_data, user=request.user)
        return Response(CampaignDetailSerializer(campaign).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        try:
            campaign = campaign_service.get_campaign_detail(campaign_id=kwargs["pk"], user=request.user)
        except ObjectDoesNotExist as exc:
            raise Http404 from exc
        self.check_object_permissions(request, campaign)
        return Response(CampaignDetailSerializer(campaign).data)

    def partial_update(self, request, *args, **kwargs):
        campaign = self.get_object()
        serializer = self.get_serializer(campaign, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = campaign_service.update_campaign(campaign=campaign, data=serializer.validated_data, user=request.user)
        return Response(CampaignDetailSerializer(updated).data)

    def destroy(self, request, *args, **kwargs):
        campaign = self.get_object()
        campaign_service.delete_campaign(campaign=campaign, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        campaign = self.get_object()
        return Response(CampaignStatsSerializer(campaign_service.get_campaign_stats(campaign=campaign)).data)

    @action(detail=True, methods=["get"], url_path="leads")
    def leads(self, request, pk=None):
        campaign = self.get_object()
        rows = [link.lead for link in campaign_service.list_related_leads(campaign=campaign)]
        return Response(CampaignLeadSerializer(rows, many=True).data)

    @action(detail=True, methods=["get"], url_path="contacts")
    def contacts(self, request, pk=None):
        campaign = self.get_object()
        rows = [link.contact for link in campaign_service.list_related_contacts(campaign=campaign)]
        return Response(CampaignContactSerializer(rows, many=True).data)

    @action(detail=True, methods=["get"], url_path="deals")
    def deals(self, request, pk=None):
        campaign = self.get_object()
        rows = [link.deal for link in campaign_service.list_related_deals(campaign=campaign)]
        return Response(CampaignDealSerializer(rows, many=True).data)

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        campaign = self.get_object()
        rows = [link.activity for link in campaign_service.list_related_activities(campaign=campaign)]
        return Response(CampaignTimelineSerializer(rows, many=True).data)

    @action(detail=True, methods=["post"], url_path="create-child")
    def create_child(self, request, pk=None):
        campaign = self.get_object()
        serializer = CampaignCreateChildSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        child = campaign_service.create_child_campaign(parent=campaign, data=serializer.validated_data, user=request.user)
        return Response(CampaignDetailSerializer(child).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        campaign = self.get_object()
        if request.method == "GET":
            return Response(CampaignNoteSerializer(campaign_service.notes_service.list_notes(campaign=campaign), many=True).data)

        serializer = CampaignNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = campaign_service.notes_service.create_note(
            campaign=campaign,
            note=serializer.validated_data["note"],
            user=request.user,
        )
        campaign_service.log_activity(
            campaign=campaign,
            action="Campaign updated",
            description="Note added",
            user=request.user,
        )
        return Response(CampaignNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        campaign = self.get_object()
        return Response(CampaignTimelineSerializer(campaign_service.timeline_service.list_events(campaign=campaign), many=True).data)

    @action(detail=True, methods=["get", "post"], url_path="attachments")
    def attachments(self, request, pk=None):
        campaign = self.get_object()
        if request.method == "GET":
            return Response(CampaignAttachmentSerializer(campaign_service.list_attachments(campaign=campaign), many=True).data)

        serializer = CampaignAttachmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = campaign_service.add_attachment(
            campaign=campaign,
            file=serializer.validated_data["file"],
            user=request.user,
        )
        return Response(CampaignAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="create-task")
    def create_task(self, request, pk=None):
        campaign = self.get_object()
        serializer = CampaignActivityActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        campaign_service.log_activity(
            campaign=campaign,
            action="Task created",
            description=serializer.validated_data["subject"],
            user=request.user,
            is_closed=False,
        )
        return Response({"message": "Task created successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="schedule-meeting")
    def schedule_meeting(self, request, pk=None):
        campaign = self.get_object()
        serializer = CampaignScheduleMeetingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        description = serializer.validated_data["meeting_subject"]
        agenda = serializer.validated_data.get("agenda", "").strip()
        if agenda:
            description = f"{description} | {agenda}"
        campaign_service.log_activity(
            campaign=campaign,
            action="Meeting scheduled",
            description=description,
            user=request.user,
            is_closed=False,
        )
        return Response({"message": "Meeting scheduled successfully"}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="log-call")
    def log_call(self, request, pk=None):
        campaign = self.get_object()
        serializer = CampaignLogCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        description = serializer.validated_data["call_summary"]
        outcome = serializer.validated_data.get("call_outcome", "").strip()
        if outcome:
            description = f"{description} | {outcome}"
        campaign_service.log_activity(
            campaign=campaign,
            action="Call logged",
            description=description,
            user=request.user,
            is_closed=False,
        )
        return Response({"message": "Call logged successfully"}, status=status.HTTP_201_CREATED)


class CampaignAttachmentDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, attachment_id: int):
        try:
            attachment = CampaignAttachment.objects.select_related("campaign").get(
                pk=attachment_id,
                is_active=True,
            )
        except CampaignAttachment.DoesNotExist:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)

        campaign = attachment.campaign
        if not can_access_campaign_owner(user=request.user, owner_id=campaign.campaign_owner_id):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        campaign_service.delete_attachment(attachment=attachment, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

