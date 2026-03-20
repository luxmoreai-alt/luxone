from django.core.management.base import BaseCommand
from django.core.management import call_command
from saas_admin.models import Company
from saas_admin.services import configure_tenant_database_in_settings


class Command(BaseCommand):
    help = "Run migrations on all active tenant databases"

    def handle(self, *args, **options):
        companies = list(Company.objects.filter(status="Active"))

        if not companies:
            self.stdout.write(self.style.WARNING("No active companies found."))
            return

        for company in companies:
            self.stdout.write(f"\n--- Migrating: {company.company_name} (db={company.db_name}) ---")
            try:
                configure_tenant_database_in_settings(company.db_name)
                call_command("migrate", database=company.db_name, verbosity=1)
                self.stdout.write(self.style.SUCCESS(f"  Done: {company.db_name}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ERROR: {e}"))
