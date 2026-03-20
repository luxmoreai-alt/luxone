from django.core.management.base import BaseCommand
from saas_admin.models import Company
from saas_admin.services import configure_tenant_database_in_settings
from authentication.models import User

EMAIL = "durgamuthusamy457@gmail.com"
PASSWORD = "durga123"


class Command(BaseCommand):
    help = "Reset or create the admin user in all active tenant databases"

    def handle(self, *args, **options):
        companies = list(Company.objects.all())

        self.stdout.write("\n=== Companies found ===")
        if not companies:
            self.stdout.write("  No companies found in default DB.")
        for c in companies:
            self.stdout.write(f"  {c.company_name}  db={c.db_name}  status={c.status}")

        fixed = False
        for company in companies:
            if company.status != "Active":
                continue

            configure_tenant_database_in_settings(company.db_name)
            self.stdout.write(f"\n--- Tenant DB: {company.db_name} ---")

            try:
                users = list(User.objects.using(company.db_name).all())
                if users:
                    for u in users:
                        self.stdout.write(f"  user: {u.email}  role={u.role}  active={u.is_active}")
                else:
                    self.stdout.write("  (no users)")

                # Get first active user or create one
                u = User.objects.using(company.db_name).filter(is_active=True).first()
                if u:
                    self.stdout.write(f"\n  Resetting password for: {u.email}")
                    u.set_password(PASSWORD)
                    u.role = "admin"
                    u.is_admin = True
                    u.must_change_password = False
                    u.save(using=company.db_name)
                    self.stdout.write(self.style.SUCCESS(
                        f"  Done! Login with: {u.email} / {PASSWORD}"
                    ))
                    fixed = True
                else:
                    self.stdout.write(f"  No user found — creating admin: {EMAIL}")
                    u = User(
                        email=EMAIL,
                        role="admin",
                        is_admin=True,
                        is_active=True,
                        name="Durga Muthusamy",
                        must_change_password=False,
                    )
                    u.set_password(PASSWORD)
                    u.save(using=company.db_name)
                    self.stdout.write(self.style.SUCCESS(
                        f"  Created! Login with: {EMAIL} / {PASSWORD}"
                    ))
                    fixed = True

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ERROR: {e}"))

        if not fixed:
            self.stdout.write(self.style.WARNING(
                "\nNo active company/tenant found. Trying default DB..."
            ))
            u = User.objects.filter(is_active=True).first()
            if u:
                u.set_password(PASSWORD)
                u.role = "admin"
                u.is_admin = True
                u.must_change_password = False
                u.save()
                self.stdout.write(self.style.SUCCESS(
                    f"Done! Login with: {u.email} / {PASSWORD}"
                ))
            else:
                u = User.objects.create_user(email=EMAIL, password=PASSWORD)
                u.role = "admin"
                u.is_admin = True
                u.name = "Durga Muthusamy"
                u.must_change_password = False
                u.save()
                self.stdout.write(self.style.SUCCESS(
                    f"Created! Login with: {EMAIL} / {PASSWORD}"
                ))
