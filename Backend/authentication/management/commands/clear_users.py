from django.core.management.base import BaseCommand
from saas_admin.models import Company
from saas_admin.services import configure_tenant_database_in_settings
from authentication.models import User


class Command(BaseCommand):
    help = "Delete all non-admin users from all active tenant databases"

    def handle(self, *args, **options):
        companies = list(Company.objects.filter(status="Active"))

        for company in companies:
            configure_tenant_database_in_settings(company.db_name)
            self.stdout.write(f"\n--- Tenant DB: {company.db_name} ---")
            try:
                deleted_qs = User.objects.using(company.db_name).exclude(role="admin")
                count = deleted_qs.count()
                emails = list(deleted_qs.values_list("email", flat=True))
                deleted_qs.delete()
                self.stdout.write(self.style.SUCCESS(
                    f"  Deleted {count} user(s): {', '.join(emails) or 'none'}"
                ))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ERROR: {e}"))

        self.stdout.write(self.style.SUCCESS("\nDone. Only admin users remain."))
