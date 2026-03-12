from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Company


class CompanyDetailApiTests(APITestCase):
    def setUp(self):
        self.admin_user = get_user_model().objects.create_superuser(
            email="superadmin@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(self.admin_user)
        self.company = Company.objects.create(
            company_name="Kwik Kopy Printing",
            company_email="admin@kwikkopy.com",
            contact_person="James Merced",
            phone="1234567890",
            subscription_plan="Pro",
            db_name="tenant_kwik_kopy_printing",
            status="Active",
        )

    @patch("saas_admin.views.get_company_usage_stats")
    def test_retrieve_company_returns_usage_stats(self, mocked_usage_stats):
        mocked_usage_stats.return_value = {
            "total_crm_users": 7,
            "total_leads": 31,
            "storage_used_mb": 12.75,
        }

        response = self.client.get(f"/api/admin/companies/{self.company.pk}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company_name"], "Kwik Kopy Printing")
        self.assertEqual(response.data["usage_stats"]["total_crm_users"], 7)
        self.assertEqual(response.data["usage_stats"]["total_leads"], 31)

    @patch("saas_admin.services.drop_tenant_database")
    @patch("saas_admin.services.tenant_database_exists")
    def test_delete_company_removes_tenant_database(self, mocked_db_exists, mocked_drop_db):
        mocked_db_exists.return_value = True

        response = self.client.delete(f"/api/admin/companies/{self.company.pk}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mocked_db_exists.assert_called_once_with("tenant_kwik_kopy_printing")
        mocked_drop_db.assert_called_once_with("tenant_kwik_kopy_printing")
        self.assertFalse(Company.objects.filter(pk=self.company.pk).exists())

    @patch("saas_admin.services.drop_tenant_database")
    @patch("saas_admin.services.tenant_database_exists")
    def test_delete_company_keeps_record_when_tenant_database_drop_fails(self, mocked_db_exists, mocked_drop_db):
        mocked_db_exists.return_value = True
        mocked_drop_db.side_effect = RuntimeError("permission denied")

        response = self.client.delete(f"/api/admin/companies/{self.company.pk}")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertTrue(Company.objects.filter(pk=self.company.pk).exists())
        self.assertIn("Failed to delete tenant database", response.data["error"])

    @patch("saas_admin.services.tenant_database_exists")
    def test_provision_blocks_when_tenant_database_already_exists(self, mocked_db_exists):
        mocked_db_exists.return_value = True

        response = self.client.post(
            "/api/admin/companies",
            {
                "company_name": "Fresh CRM",
                "company_email": "owner@freshcrm.com",
                "contact_person": "Owner",
                "subscription_plan": "Basic",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already exists", response.data["error"])
