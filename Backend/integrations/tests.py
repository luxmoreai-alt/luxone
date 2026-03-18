from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Account
from contacts.models import Contact
from deals.models import Deal, DealStage
from deals.services import ensure_default_stages
from leads.models import Lead
from support.models import SupportCase

from .models import EmailProviderIntegration, SocialLeadAutomationRule, VisitorTrackingPortal, VisitorTrackingSetting
from .services import create_synced_email_message


class IntegrationLinkingTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="integrations@example.com",
            password="StrongPass123",
            is_active=True,
        )
        self.client.force_authenticate(self.user)
        ensure_default_stages()
        self.stage = DealStage.objects.get(stage_name="Qualification")
        self.account = Account.objects.create(
            account_name="Zora",
            account_owner=self.user,
            website="https://zora.com",
        )
        self.contact = Contact.objects.create(
            first_name="Boomika",
            last_name="M",
            email="boomika@zora.com",
            phone="9999999999",
            account=self.account,
            contact_owner=self.user,
        )
        self.deal = Deal.objects.create(
            deal_name="Zora - Boomika Deal",
            account=self.account,
            contact=self.contact,
            deal_owner=self.user,
            stage=self.stage,
            probability=self.stage.probability,
        )
        self.case = SupportCase.objects.create(
            subject="License complaint",
            case_number="CASE-0099",
            owner=self.user,
            related_contact=self.contact,
            account=self.account,
            deal=self.deal,
            email=self.contact.email,
        )
        self.provider = EmailProviderIntegration.objects.create(
            provider_type=EmailProviderIntegration.ProviderType.GMAIL,
            protocol_type=EmailProviderIntegration.ProtocolType.IMAP_OAUTH,
            email_address="crm@zora.com",
            created_by=self.user,
        )
        self.portal = VisitorTrackingPortal.objects.create(
            portal_name="Zora Portal",
            portal_url="https://zora.com",
            created_by=self.user,
        )
        VisitorTrackingSetting.objects.create(
            portal=self.portal,
            push_new_visitors_as=VisitorTrackingSetting.PushAs.LEAD,
            assign_lead_to_user=self.user,
            app_name="Zora Portal",
            tracking_code="<script></script>",
        )

    def test_case_email_endpoint_returns_auto_linked_synced_email(self):
        create_synced_email_message(
            provider_integration=self.provider,
            payload={
                "external_message_id": "gmail-case-1",
                "subject": "Re: CASE-0099 License complaint",
                "from_email": "boomika@zora.com",
                "to_emails": ["crm@zora.com"],
                "body_text": "Need help with the Zora contract renewal.",
            },
            owner=self.user,
        )

        response = self.client.get(f"/api/cases/{self.case.pk}/emails")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["subject"], "Re: CASE-0099 License complaint")
        self.assertEqual(response.data[0]["sent_by_email"], "boomika@zora.com")

    def test_social_message_can_create_case_and_record_endpoint_data(self):
        SocialLeadAutomationRule.objects.create(
            platform=SocialLeadAutomationRule.Platform.FACEBOOK,
            trigger_type=SocialLeadAutomationRule.TriggerType.MESSAGE,
            action_type=SocialLeadAutomationRule.ActionType.CREATE_CASE,
            assign_to_user=self.user,
        )

        response = self.client.post(
            "/api/integrations/social/messages",
            {
                "platform": "facebook",
                "sender_name": "Boomika M",
                "sender_email": "boomika@zora.com",
                "message": "Complaint: the CRM license is not working for our team.",
                "external_message_id": "fb-msg-1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data["support_case"])

        social_response = self.client.get(f"/api/cases/{response.data['support_case']}/social")
        self.assertEqual(social_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(social_response.data), 1)
        self.assertEqual(social_response.data[0]["contact_name"], "Boomika M")

    def test_visitor_event_can_auto_convert_to_lead_and_be_listed(self):
        response = self.client.post(
            "/api/visitors/events",
            {
                "portal": self.portal.pk,
                "session_id": "session-123",
                "visitor_name": "New Visitor",
                "identified_email": "visitor@example.com",
                "page_url": "https://zora.com/pricing/enterprise",
                "event_type": "visit",
                "source_reference": "pricing-visit",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        lead = Lead.objects.get(email="visitor@example.com")
        self.assertEqual(response.data["linked_lead"], lead.pk)

        visitor_response = self.client.get(f"/api/leads/{lead.pk}/visitor-events")
        self.assertEqual(visitor_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(visitor_response.data), 1)
        self.assertEqual(visitor_response.data[0]["page_url"], "https://zora.com/pricing/enterprise")
