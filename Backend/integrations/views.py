from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import (
    EmailAuthenticationDomainFilter,
    EmailProviderIntegrationFilter,
    IntegrationLeadSourceEventFilter,
    OrganizationEmailAddressFilter,
    SocialAccountFilter,
    SocialMessageFilter,
    SyncedEmailMessageFilter,
    VisitorLeadEventFilter,
    VisitorTrackingPortalFilter,
)
from .models import (
    BCCDropboxSetting,
    CustomEmailFieldPreference,
    EmailAuthenticationDomain,
    EmailComposeSetting,
    EmailCredibilityMetric,
    EmailInsightSetting,
    EmailParserInbox,
    EmailProviderIntegration,
    EmailRelayServer,
    EmailSharingPermission,
    EmailSyncLog,
    IntegrationLeadSourceEvent,
    OrganizationEmailAddress,
    SalesInboxSetting,
    SocialAccount,
    SocialBrand,
    SocialLeadAutomationRule,
    SocialMessage,
    SocialPermissionSetting,
    SyncedEmailMessage,
    UnsubscribeLink,
    VisitorLeadEvent,
    VisitorTrackingPortal,
    VisitorTrackingSetting,
)
from .permissions import IsIntegrationAdminOrReadOnly, IsOwnerOrIntegrationAdmin, is_integration_admin
from .serializers import (
    BCCAddressAddSerializer,
    BCCAddressVerifySerializer,
    BCCDropboxSettingSerializer,
    CredibilityReportSerializer,
    CustomEmailFieldPreferenceSerializer,
    EmailAuthenticationDomainSerializer,
    EmailComposeSettingSerializer,
    EmailCredibilityMetricSerializer,
    EmailInsightSettingSerializer,
    EmailParserInboxSerializer,
    EmailProviderIntegrationDetailSerializer,
    EmailProviderIntegrationListSerializer,
    EmailProviderIntegrationWriteSerializer,
    EmailProviderSyncRequestSerializer,
    EmailRelayServerSerializer,
    EmailSharingPermissionSerializer,
    EmailSyncLogSerializer,
    IntegrationLeadSourceEventSerializer,
    OrganizationEmailAddressSerializer,
    ParserGenerateSerializer,
    ParserIngestSerializer,
    SalesInboxFeedSerializer,
    SalesInboxSettingSerializer,
    SocialAccountSerializer,
    SocialBrandDetailSerializer,
    SocialBrandListSerializer,
    SocialConnectSerializer,
    SocialLeadAutomationRuleSerializer,
    SocialMessageSerializer,
    SocialPermissionSettingSerializer,
    TrackingCodeSerializer,
    UnsubscribeLinkSerializer,
    VisitorLeadEventLinkSerializer,
    VisitorLeadEventSerializer,
    VisitorTrackingPortalSerializer,
    VisitorTrackingSettingSerializer,
)
from .services import (
    add_verified_bcc_address,
    build_credibility_report,
    build_sales_inbox_queryset,
    check_domain_status,
    confirm_organization_email,
    connect_social_account,
    convert_visitor_event,
    create_visitor_event,
    disconnect_social_account,
    ensure_portal_tracking_code,
    generate_bcc_address,
    generate_parser_address,
    ingest_social_message,
    ingest_parser_message,
    process_bcc_payload,
    regenerate_bcc_dropbox,
    run_provider_sync,
    link_visitor_event_to_lead,
    verify_bcc_address,
    visible_queryset,
)
from leads.models import Lead


class IntegrationBaseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering = ["-created_at"]

    def sort_queryset(self, queryset):
        sort = self.request.query_params.get("sort")
        if not sort:
            return queryset
        allowed = set(getattr(self, "ordering_fields", []))
        normalized = sort[1:] if sort.startswith("-") else sort
        if normalized in allowed:
            return queryset.order_by(sort)
        return queryset


class EmailProviderIntegrationViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrIntegrationAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EmailProviderIntegrationFilter
    search_fields = ["email_address", "display_name", "provider_type"]
    ordering_fields = ["created_at", "updated_at", "email_address", "provider_type", "is_active"]
    queryset = EmailProviderIntegration.objects.select_related("created_by")

    def get_queryset(self):
        return self.sort_queryset(visible_queryset(self.queryset, self.request.user))

    def get_serializer_class(self):
        if self.action == "list":
            return EmailProviderIntegrationListSerializer
        if self.action in {"create", "update", "partial_update"}:
            return EmailProviderIntegrationWriteSerializer
        if self.action == "sync":
            return EmailProviderSyncRequestSerializer
        return EmailProviderIntegrationDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(created_by=request.user)
        detail_data = EmailProviderIntegrationDetailSerializer(instance, context=self.get_serializer_context()).data
        return Response(
            {
                "message": "Email provider added successfully",
                "data": detail_data,
            },
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(
            {
                "message": "Email provider updated successfully",
                "data": EmailProviderIntegrationDetailSerializer(
                    updated,
                    context=self.get_serializer_context(),
                ).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="sync")
    def sync(self, request, pk=None):
        provider = self.get_object()
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        sync_type = serializer.validated_data.get("sync_type", "incremental_sync")
        log = run_provider_sync(
            provider_integration=provider,
            sync_type=sync_type,
            triggered_by=request.user,
        )
        return Response(
            {
                "message": "Provider sync completed successfully.",
                "emails_synced": log.metadata.get("messages_processed", 0),
                "lead_matches": log.metadata.get("lead_matches", 0),
                "log": EmailSyncLogSerializer(log).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class EmailComposeSettingViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrIntegrationAdmin]
    queryset = EmailComposeSetting.objects.select_related("user", "default_from_integration", "default_reply_to_integration")
    ordering_fields = ["created_at", "updated_at", "default_font_family"]
    serializer_class = EmailComposeSettingSerializer

    def get_queryset(self):
        queryset = self.queryset
        if not is_integration_admin(self.request.user):
            queryset = queryset.filter(user=self.request.user)
        return self.sort_queryset(queryset)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user if not is_integration_admin(self.request.user) else serializer.validated_data.get("user") or self.request.user)


class EmailSharingPermissionViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrIntegrationAdmin]
    queryset = EmailSharingPermission.objects.select_related("user")
    ordering_fields = ["created_at", "updated_at", "configuration_type", "sharing_mode"]
    serializer_class = EmailSharingPermissionSerializer

    def get_queryset(self):
        queryset = self.queryset
        if not is_integration_admin(self.request.user):
            queryset = queryset.filter(user=self.request.user)
        return self.sort_queryset(queryset)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user if not is_integration_admin(self.request.user) else serializer.validated_data.get("user") or self.request.user)


class OrganizationEmailAddressViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = OrganizationEmailAddressFilter
    search_fields = ["display_name", "email_address"]
    ordering_fields = ["created_at", "updated_at", "display_name", "confirmation_status", "authentication_status"]
    queryset = OrganizationEmailAddress.objects.select_related("created_by")
    serializer_class = OrganizationEmailAddressSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        instance = self.get_object()
        confirm_organization_email(instance)
        return Response(self.get_serializer(instance).data)


class CustomEmailFieldPreferenceViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = CustomEmailFieldPreference.objects.all()
    ordering_fields = ["created_at", "updated_at"]
    serializer_class = CustomEmailFieldPreferenceSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)


class SalesInboxSettingViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = SalesInboxSetting.objects.select_related("provider_integration")
    ordering_fields = ["created_at", "updated_at"]

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def get_serializer_class(self):
        if self.action == "feed":
            return SalesInboxFeedSerializer
        return SalesInboxSettingSerializer

    @action(detail=False, methods=["get"], url_path="feed")
    def feed(self, request):
        queryset = build_sales_inbox_queryset(request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        return Response(self.get_serializer(queryset, many=True).data)


class SyncedEmailMessageViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SyncedEmailMessage.objects.select_related(
        "lead",
        "contact",
        "account",
        "deal",
        "support_case",
        "provider_integration",
    )
    serializer_class = SalesInboxFeedSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SyncedEmailMessageFilter
    search_fields = ["subject", "from_email", "thread_id", "provider_integration__email_address"]
    ordering_fields = ["created_at", "updated_at", "received_at", "sent_at", "status", "direction"]
    ordering = ["-received_at", "-created_at"]

    def get_queryset(self):
        queryset = self.queryset
        if not is_integration_admin(self.request.user):
            queryset = queryset.filter(provider_integration__created_by=self.request.user)
        return queryset


class EmailParserInboxViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = EmailParserInbox.objects.all()
    ordering_fields = ["created_at", "updated_at", "parser_name"]

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def get_serializer_class(self):
        if self.action == "generate":
            return ParserGenerateSerializer
        if self.action == "ingest":
            return ParserIngestSerializer
        return EmailParserInboxSerializer

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = EmailParserInbox.objects.create(
            parser_name=serializer.validated_data["parser_name"],
            parser_email_address=generate_parser_address(serializer.validated_data["parser_name"]),
            mapping_config=serializer.validated_data.get("mapping_config", {}),
            create_record_type=serializer.validated_data.get("create_record_type", EmailParserInbox.RecordType.LEAD),
        )
        return Response(EmailParserInboxSerializer(instance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="ingest")
    def ingest(self, request, pk=None):
        parser_inbox = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = ingest_parser_message(parser_inbox=parser_inbox, payload=serializer.validated_data, user=request.user)
        return Response(
            {
                "message": "Parser email ingested successfully.",
                "lead_id": getattr(result.get("lead"), "id", None),
                "contact_id": getattr(result.get("contact"), "id", None),
                "support_case_id": getattr(result.get("support_case"), "id", None),
                "event_id": result["event"].id,
            },
            status=status.HTTP_201_CREATED,
        )


class BCCDropboxSettingViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = BCCDropboxSetting.objects.prefetch_related("verified_addresses")
    ordering_fields = ["created_at", "updated_at"]

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def get_serializer_class(self):
        if self.action == "add_email":
            return BCCAddressAddSerializer
        if self.action == "verify_email":
            return BCCAddressVerifySerializer
        return BCCDropboxSettingSerializer

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        payload.setdefault("dropbox_email_address", generate_bcc_address())
        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(BCCDropboxSettingSerializer(instance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="add-email")
    def add_email(self, request, pk=None):
        setting = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        address = add_verified_bcc_address(setting=setting, email_address=serializer.validated_data["email_address"])
        return Response(
            {
                "id": address.id,
                "email_address": address.email_address,
                "verification_status": address.verification_status,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="verify-email")
    def verify_email(self, request, pk=None):
        setting = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            address = verify_bcc_address(
                setting=setting,
                email_address=serializer.validated_data["email_address"],
                verification_code=serializer.validated_data["verification_code"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"id": address.id, "verification_status": address.verification_status})

    @action(detail=True, methods=["post"], url_path="regenerate")
    def regenerate(self, request, pk=None):
        setting = regenerate_bcc_dropbox(self.get_object())
        return Response(BCCDropboxSettingSerializer(setting).data)

    @action(detail=True, methods=["post"], url_path="process")
    def process(self, request, pk=None):
        setting = self.get_object()
        result = process_bcc_payload(setting=setting, payload=request.data, user=request.user)
        return Response(
            {
                "message": "BCC payload processed successfully.",
                "lead_id": getattr(result.get("lead"), "id", None),
                "contact_id": getattr(result.get("contact"), "id", None),
                "event_id": result["event"].id,
            },
            status=status.HTTP_201_CREATED,
        )


class EmailAuthenticationDomainViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = EmailAuthenticationDomainFilter
    search_fields = ["domain_name", "email_status"]
    ordering_fields = ["created_at", "updated_at", "domain_name", "authentication_status"]
    queryset = EmailAuthenticationDomain.objects.all()
    serializer_class = EmailAuthenticationDomainSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    @action(detail=True, methods=["post"], url_path="check-status")
    def check_status(self, request, pk=None):
        instance = check_domain_status(self.get_object())
        return Response(self.get_serializer(instance).data)


class EmailRelayServerViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = EmailRelayServer.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["server_name", "domain_name", "email_type", "username"]
    ordering_fields = ["created_at", "updated_at", "server_name", "domain_name"]
    serializer_class = EmailRelayServerSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)


class EmailCredibilityMetricViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = EmailCredibilityMetric.objects.all()
    serializer_class = EmailCredibilityMetricSerializer
    ordering = ["-report_period_end"]

    @action(detail=False, methods=["get"], url_path="report")
    def report(self, request):
        return Response(CredibilityReportSerializer(build_credibility_report()).data)


class EmailInsightSettingViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = EmailInsightSetting.objects.select_related("enabled_by")
    ordering_fields = ["created_at", "updated_at", "enabled_at"]
    serializer_class = EmailInsightSettingSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)


class UnsubscribeLinkViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = UnsubscribeLink.objects.select_related("created_by")
    ordering_fields = ["created_at", "updated_at", "name"]
    serializer_class = UnsubscribeLinkSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SocialBrandViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = SocialBrand.objects.prefetch_related("accounts")
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["brand_name", "brand_description"]
    ordering_fields = ["created_at", "updated_at", "brand_name"]

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def get_serializer_class(self):
        if self.action == "list":
            return SocialBrandListSerializer
        return SocialBrandDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SocialAccountViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = SocialAccount.objects.select_related("brand")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SocialAccountFilter
    search_fields = ["account_name", "handle", "platform", "brand__brand_name"]
    ordering_fields = ["created_at", "updated_at", "account_name", "platform"]

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def get_serializer_class(self):
        if self.action in {"connect", "disconnect"}:
            return SocialConnectSerializer
        return SocialAccountSerializer

    @action(detail=True, methods=["post"], url_path="connect")
    def connect(self, request, pk=None):
        account = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        connect_social_account(account, serializer.validated_data)
        return Response(SocialAccountSerializer(account).data)

    @action(detail=True, methods=["post"], url_path="disconnect")
    def disconnect(self, request, pk=None):
        account = disconnect_social_account(self.get_object())
        return Response(SocialAccountSerializer(account).data)


class SocialPermissionSettingViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = SocialPermissionSetting.objects.all()
    ordering_fields = ["created_at", "updated_at", "social_admin_role_name"]
    serializer_class = SocialPermissionSettingSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)


class SocialLeadAutomationRuleViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = SocialLeadAutomationRule.objects.select_related("assign_to_user")
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["platform", "trigger_type", "assign_to_team", "assign_to_user__email"]
    ordering_fields = ["created_at", "updated_at", "platform", "trigger_type"]
    serializer_class = SocialLeadAutomationRuleSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)


class SocialMessageViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated]
    queryset = SocialMessage.objects.select_related(
        "brand",
        "social_account",
        "lead",
        "contact",
        "account",
        "deal",
        "support_case",
    )
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SocialMessageFilter
    search_fields = ["sender_name", "sender_email", "profile_handle", "message", "external_message_id"]
    ordering_fields = ["created_at", "updated_at", "created_at_source", "platform"]
    serializer_class = SocialMessageSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = ingest_social_message(payload=serializer.validated_data, user=request.user)
        return Response(SocialMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class VisitorTrackingPortalViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = VisitorTrackingPortal.objects.select_related("created_by")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = VisitorTrackingPortalFilter
    search_fields = ["portal_name", "portal_url"]
    ordering_fields = ["created_at", "updated_at", "portal_name", "is_available"]
    serializer_class = VisitorTrackingPortalSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def perform_create(self, serializer):
        portal = serializer.save(created_by=self.request.user)
        ensure_portal_tracking_code(
            portal,
            app_name=portal.portal_name,
            defaults={"push_new_visitors_as": "lead", "app_name": portal.portal_name},
        )

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request, pk=None):
        portal = self.get_object()
        portal.is_active = False
        portal.is_available = False
        portal.save(update_fields=["is_active", "is_available", "updated_at"])
        return Response(self.get_serializer(portal).data)


class VisitorTrackingSettingViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated, IsIntegrationAdminOrReadOnly]
    queryset = VisitorTrackingSetting.objects.select_related("portal", "assign_lead_to_user")
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["portal__portal_name", "app_name", "department_name"]
    ordering_fields = ["created_at", "updated_at", "app_name"]

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def get_serializer_class(self):
        if self.action == "tracking_code":
            return TrackingCodeSerializer
        return VisitorTrackingSettingSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        portal = serializer.validated_data["portal"]
        instance = ensure_portal_tracking_code(
            portal,
            app_name=serializer.validated_data["app_name"],
            defaults={key: value for key, value in serializer.validated_data.items() if key != "portal"},
        )
        for field, value in serializer.validated_data.items():
            if field != "portal":
                setattr(instance, field, value)
        instance.save()
        return Response(VisitorTrackingSettingSerializer(instance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="tracking-code")
    def tracking_code(self, request, pk=None):
        setting = self.get_object()
        return Response({"tracking_code": setting.tracking_code})


class VisitorLeadEventViewSet(IntegrationBaseViewSet):
    permission_classes = [IsAuthenticated]
    queryset = VisitorLeadEvent.objects.select_related("portal", "linked_lead", "linked_contact")
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = VisitorLeadEventFilter
    search_fields = ["visitor_name", "visitor_email", "source_url", "event_type"]
    ordering_fields = ["created_at", "updated_at", "event_type"]
    serializer_class = VisitorLeadEventSerializer

    def get_queryset(self):
        return self.sort_queryset(self.queryset)

    def get_serializer_class(self):
        if self.action == "link_lead":
            return VisitorLeadEventLinkSerializer
        return VisitorLeadEventSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = create_visitor_event(payload=serializer.validated_data, user=request.user)
        return Response(
            {
                **VisitorLeadEventSerializer(result["visitor_event"]).data,
                "linked_source_event_id": result["source_event"].id,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="convert-to-lead")
    def convert_to_lead(self, request, pk=None):
        event = self.get_object()
        result = convert_visitor_event(visitor_event=event, user=request.user)
        return Response(
            {
                "lead_id": getattr(result.get("lead"), "id", None),
                "contact_id": getattr(result.get("contact"), "id", None),
                "event_id": getattr(result.get("event"), "id", None),
            }
        )

    @action(detail=True, methods=["post"], url_path="link-lead")
    def link_lead(self, request, pk=None):
        event = self.get_object()
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        target_lead = None
        lead_id = serializer.validated_data.get("lead_id")
        if lead_id:
            target_lead = Lead.objects.filter(pk=lead_id).first()
            if not target_lead:
                return Response({"detail": "Lead not found."}, status=status.HTTP_404_NOT_FOUND)
        linked_lead = link_visitor_event_to_lead(visitor_event=event, lead=target_lead, user=request.user)
        return Response(
            {
                "message": "Visitor event linked successfully.",
                "lead_id": getattr(linked_lead, "id", None),
                "event_id": event.id,
            }
        )


class IntegrationLeadSourceEventViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = IntegrationLeadSourceEvent.objects.select_related("lead", "contact", "account", "deal", "support_case")
    serializer_class = IntegrationLeadSourceEventSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = IntegrationLeadSourceEventFilter
    search_fields = ["source_reference", "status", "lead__email", "contact__email", "deal__deal_name"]
    ordering_fields = ["created_at", "updated_at", "source_type", "status"]
    ordering = ["-created_at"]


class RecordEmailListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    lookup_field = ""

    def get_queryset(self):
        filter_key = {f"{self.lookup_field}_id": self.kwargs["pk"]}
        queryset = SyncedEmailMessage.objects.select_related(
            "provider_integration",
            "lead",
            "contact",
            "account",
            "deal",
            "support_case",
        ).filter(**filter_key)
        if not is_integration_admin(self.request.user):
            queryset = queryset.filter(provider_integration__created_by=self.request.user)
        return queryset.order_by("-received_at", "-created_at")

    def get(self, request, pk=None):
        return Response(SalesInboxFeedSerializer(self.get_queryset(), many=True).data)


class RecordSocialListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    lookup_field = ""

    def get_queryset(self):
        return SocialMessage.objects.select_related(
            "brand",
            "social_account",
            "lead",
            "contact",
            "account",
            "deal",
            "support_case",
        ).filter(**{f"{self.lookup_field}_id": self.kwargs["pk"]}).order_by("-created_at_source", "-created_at")

    def get(self, request, pk=None):
        return Response(SocialMessageSerializer(self.get_queryset(), many=True).data)


class LeadVisitorEventListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        lead = get_object_or_404(Lead, pk=pk)
        filters_q = Q(linked_lead=lead)
        if getattr(lead, "converted_contact", None):
            filters_q |= Q(linked_contact=lead.converted_contact)
        queryset = VisitorLeadEvent.objects.select_related("portal", "linked_lead", "linked_contact").filter(filters_q).order_by("-created_at")
        return Response(VisitorLeadEventSerializer(queryset, many=True).data)


class ContactVisitorEventListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        queryset = VisitorLeadEvent.objects.select_related("portal", "linked_lead", "linked_contact").filter(
            linked_contact_id=pk
        ).order_by("-created_at")
        return Response(VisitorLeadEventSerializer(queryset, many=True).data)


class LeadEmailListAPIView(RecordEmailListAPIView):
    lookup_field = "lead"


class ContactEmailListAPIView(RecordEmailListAPIView):
    lookup_field = "contact"


class AccountEmailListAPIView(RecordEmailListAPIView):
    lookup_field = "account"


class DealEmailListAPIView(RecordEmailListAPIView):
    lookup_field = "deal"


class CaseEmailListAPIView(RecordEmailListAPIView):
    lookup_field = "support_case"


class LeadSocialListAPIView(RecordSocialListAPIView):
    lookup_field = "lead"


class ContactSocialListAPIView(RecordSocialListAPIView):
    lookup_field = "contact"


class CaseSocialListAPIView(RecordSocialListAPIView):
    lookup_field = "support_case"


class EmailSyncLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = EmailSyncLog.objects.select_related("provider_integration")
    serializer_class = EmailSyncLogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["provider_integration__email_address", "sync_type", "status", "error_message"]
    ordering_fields = ["created_at", "updated_at", "last_synced_at", "status"]
    ordering = ["-created_at"]
