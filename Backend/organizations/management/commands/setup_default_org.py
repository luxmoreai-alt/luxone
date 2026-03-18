"""
Management command: setup_default_org

Creates the default Organization and assigns all existing users + leads to it.
Run once after applying migrations:

    python manage.py setup_default_org
    python manage.py setup_default_org --org-name "Acme Corp"  # custom name
"""

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Create a default Organization and backfill existing users and leads."

    def add_arguments(self, parser):
        parser.add_argument(
            "--org-name",
            default="Main Organization",
            help="Name of the default organization (default: 'Main Organization')",
        )

    def handle(self, *args, **options):
        from organizations.models import Organization
        from django.contrib.auth import get_user_model
        from leads.models import Lead

        User = get_user_model()
        org_name = options["org_name"]

        with transaction.atomic():
            # ── 1. Create (or get) the default organization ──────────────────
            org, created = Organization.objects.get_or_create(
                name=org_name,
                defaults={"is_active": True},
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created Organization: '{org.name}' (id={org.pk})"))
            else:
                self.stdout.write(f"  Organization already exists: '{org.name}' (id={org.pk})")

            # ── 2. Assign all unassigned users to the default organization ───
            unassigned_users = User.objects.filter(organization__isnull=True)
            count = unassigned_users.count()
            unassigned_users.update(organization=org)
            self.stdout.write(self.style.SUCCESS(f"  Assigned {count} user(s) to '{org.name}'"))

            # ── 3. Set roles based on is_admin flag ──────────────────────────
            admin_count = User.objects.filter(
                organization=org, is_admin=True
            ).exclude(role="admin").update(role="admin")

            superuser_count = User.objects.filter(
                organization=org, is_superuser=True
            ).exclude(role="admin").update(role="admin")

            self.stdout.write(
                self.style.SUCCESS(
                    f"  Set role=admin for {admin_count + superuser_count} admin/superuser(s)"
                )
            )

            # ── 4. Assign all unassigned leads to the default organization ───
            unassigned_leads = Lead.objects.filter(organization__isnull=True)
            lead_count = unassigned_leads.count()
            unassigned_leads.update(organization=org)
            self.stdout.write(self.style.SUCCESS(f"  Assigned {lead_count} lead(s) to '{org.name}'"))

            # ── 5. Assign ownerless leads to the first admin ─────────────────
            admin_user = (
                User.objects.filter(organization=org, role="admin").first()
                or User.objects.filter(organization=org, is_admin=True).first()
            )
            if admin_user:
                ownerless = Lead.objects.filter(organization=org, owner__isnull=True)
                ownerless_count = ownerless.count()
                ownerless.update(owner=admin_user)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Assigned {ownerless_count} ownerless lead(s) to admin '{admin_user.email}'"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING("  No admin user found — ownerless leads were not reassigned.")
                )

        self.stdout.write(self.style.SUCCESS("\nDone. Default organization setup complete."))
