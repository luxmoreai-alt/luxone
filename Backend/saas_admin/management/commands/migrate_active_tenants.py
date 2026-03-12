from django.core.management import BaseCommand, call_command

from saas_admin.models import Company
from saas_admin.services import configure_tenant_database_in_settings


class Command(BaseCommand):
    help = "Run migrations for all active tenant databases."

    def handle(self, *args, **options):
        active_companies = Company.objects.filter(status="Active").order_by("id")
        if not active_companies.exists():
            self.stdout.write(self.style.WARNING("No active tenant databases found."))
            return

        for company in active_companies:
            db_name = company.db_name
            self.stdout.write(f"Migrating tenant database: {db_name}")
            configure_tenant_database_in_settings(db_name)
            call_command("migrate", database=db_name, interactive=False, verbosity=0)

        self.stdout.write(self.style.SUCCESS("All active tenant migrations applied successfully."))

