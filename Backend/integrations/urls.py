from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountEmailListAPIView,
    BCCDropboxSettingViewSet,
    CaseEmailListAPIView,
    CaseSocialListAPIView,
    ContactEmailListAPIView,
    ContactSocialListAPIView,
    ContactVisitorEventListAPIView,
    DealEmailListAPIView,
    CustomEmailFieldPreferenceViewSet,
    EmailAuthenticationDomainViewSet,
    EmailComposeSettingViewSet,
    EmailCredibilityMetricViewSet,
    EmailInsightSettingViewSet,
    EmailParserInboxViewSet,
    EmailProviderIntegrationViewSet,
    EmailRelayServerViewSet,
    EmailSharingPermissionViewSet,
    EmailSyncLogViewSet,
    IntegrationLeadSourceEventViewSet,
    OrganizationEmailAddressViewSet,
    SalesInboxSettingViewSet,
    SocialAccountViewSet,
    SocialBrandViewSet,
    SocialLeadAutomationRuleViewSet,
    SocialMessageViewSet,
    SocialPermissionSettingViewSet,
    SyncedEmailMessageViewSet,
    UnsubscribeLinkViewSet,
    LeadEmailListAPIView,
    LeadSocialListAPIView,
    LeadVisitorEventListAPIView,
    VisitorLeadEventViewSet,
    VisitorTrackingPortalViewSet,
    VisitorTrackingSettingViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register(r"integrations/email/providers", EmailProviderIntegrationViewSet, basename="integration-email-provider")
router.register(r"integrations/email/compose-settings", EmailComposeSettingViewSet, basename="integration-email-compose-setting")
router.register(r"integrations/email/sharing", EmailSharingPermissionViewSet, basename="integration-email-sharing")
router.register(r"integrations/email/organization-emails", OrganizationEmailAddressViewSet, basename="integration-organization-email")
router.register(r"integrations/email/custom-email-fields", CustomEmailFieldPreferenceViewSet, basename="integration-custom-email-field")
router.register(r"integrations/email/sales-inbox", SalesInboxSettingViewSet, basename="integration-sales-inbox")
router.register(r"integrations/email/messages", SyncedEmailMessageViewSet, basename="integration-email-message")
router.register(r"integrations/email/parser", EmailParserInboxViewSet, basename="integration-email-parser")
router.register(r"integrations/email/bcc-dropbox", BCCDropboxSettingViewSet, basename="integration-bcc-dropbox")
router.register(r"integrations/email/deliverability/domains", EmailAuthenticationDomainViewSet, basename="integration-email-domain")
router.register(r"integrations/email/deliverability/relay", EmailRelayServerViewSet, basename="integration-email-relay")
router.register(r"integrations/email/deliverability/credibility", EmailCredibilityMetricViewSet, basename="integration-email-credibility")
router.register(r"integrations/email/insights", EmailInsightSettingViewSet, basename="integration-email-insight")
router.register(r"integrations/email/unsubscribe-links", UnsubscribeLinkViewSet, basename="integration-unsubscribe-link")
router.register(r"integrations/social/brands", SocialBrandViewSet, basename="integration-social-brand")
router.register(r"integrations/social/accounts", SocialAccountViewSet, basename="integration-social-account")
router.register(r"integrations/social/admin-settings", SocialPermissionSettingViewSet, basename="integration-social-admin-setting")
router.register(r"integrations/social/automation-rules", SocialLeadAutomationRuleViewSet, basename="integration-social-automation-rule")
router.register(r"integrations/social/messages", SocialMessageViewSet, basename="integration-social-message")
router.register(r"integrations/visitors/portals", VisitorTrackingPortalViewSet, basename="integration-visitor-portal")
router.register(r"integrations/visitors/settings", VisitorTrackingSettingViewSet, basename="integration-visitor-setting")
router.register(r"integrations/visitors/events", VisitorLeadEventViewSet, basename="integration-visitor-event")
router.register(r"visitors/events", VisitorLeadEventViewSet, basename="visitor-event")
router.register(r"integrations/lead-source-events", IntegrationLeadSourceEventViewSet, basename="integration-source-event")
router.register(r"integrations/email/sync-logs", EmailSyncLogViewSet, basename="integration-sync-log")

urlpatterns = [
    path("leads/<int:pk>/emails", LeadEmailListAPIView.as_view(), name="lead-emails"),
    path("contacts/<int:pk>/emails", ContactEmailListAPIView.as_view(), name="contact-emails"),
    path("accounts/<int:pk>/emails", AccountEmailListAPIView.as_view(), name="account-emails"),
    path("deals/<int:pk>/emails", DealEmailListAPIView.as_view(), name="deal-emails"),
    path("cases/<int:pk>/emails", CaseEmailListAPIView.as_view(), name="case-emails"),
    path("leads/<int:pk>/social", LeadSocialListAPIView.as_view(), name="lead-social"),
    path("contacts/<int:pk>/social", ContactSocialListAPIView.as_view(), name="contact-social"),
    path("cases/<int:pk>/social", CaseSocialListAPIView.as_view(), name="case-social"),
    path("leads/<int:pk>/visitor-events", LeadVisitorEventListAPIView.as_view(), name="lead-visitor-events"),
    path("contacts/<int:pk>/visitor-events", ContactVisitorEventListAPIView.as_view(), name="contact-visitor-events"),
    path("", include(router.urls)),
]
