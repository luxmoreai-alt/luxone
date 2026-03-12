import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from django.db import transaction
from django.conf import settings
from django.core.management import call_command
from django.contrib.auth import get_user_model
from string import ascii_letters, digits
from random import choice

from leads.models import Lead

from .models import Company

def generate_secure_password(length=12):
    return ''.join(choice(ascii_letters + digits) for _ in range(length))


def get_postgres_admin_connection():
    conn = psycopg2.connect(
        dbname='postgres',
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        host=settings.DB_HOST,
        port=settings.DB_PORT
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    return conn


def tenant_database_exists(db_name):
    conn = get_postgres_admin_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s",
                [db_name],
            )
            return cursor.fetchone() is not None
    finally:
        conn.close()

def create_tenant_database(db_name):
    """
    Connects to Postgres and runs CREATE DATABASE.
    """
    conn = get_postgres_admin_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
    finally:
        conn.close()


def drop_tenant_database(db_name):
    """
    Terminates active connections and drops the tenant database.
    """
    conn = get_postgres_admin_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = %s
                  AND pid <> pg_backend_pid()
                """,
                [db_name],
            )
            cursor.execute(sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(db_name)))
    finally:
        conn.close()

def configure_tenant_database_in_settings(db_name):
    """
    Dynamically injects the new DB into settings.DATABASES so Django knows it exists right now.
    """
    settings.DATABASES[db_name] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_name,
        'USER': settings.DB_USER,
        'PASSWORD': settings.DB_PASSWORD,
        'HOST': settings.DB_HOST,
        'PORT': settings.DB_PORT,
        'OPTIONS': {},
        'TIME_ZONE': None,
        'CONN_MAX_AGE': 0,
        'CONN_HEALTH_CHECKS': False,
        'AUTOCOMMIT': True,
        'ATOMIC_REQUESTS': False,
    }

def run_tenant_migrations(db_name):
    """
    Runs migrations on the newly created tenant DB.
    """
    configure_tenant_database_in_settings(db_name)
    call_command('migrate', database=db_name, interactive=False)

def create_or_reset_tenant_admin(db_name, email, password, remove_other_admins=False):
    """
    Creates or resets the primary tenant admin in the tenant's database.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    configure_tenant_database_in_settings(db_name)

    user = User.objects.using(db_name).filter(email=email).first()
    if user:
        user.set_password(password)
        user.is_admin = True
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save(using=db_name)
    else:
        User.objects.db_manager(db_name).create_superuser(
            email=email,
            password=password
        )

    if remove_other_admins:
        User.objects.using(db_name).filter(is_admin=True).exclude(email=email).delete()

def create_tenant_admin(db_name, email, password):
    """
    Backward-compatible wrapper for tenant admin creation.
    """
    create_or_reset_tenant_admin(db_name, email, password)

def provision_new_company_tenant(company_data):
    """
    Full pipeline to provision a new company.
    """
    # 1. Clean DB name format
    raw_name = company_data['company_name'].lower().replace(' ', '_').replace('-', '_')
    db_name = f"tenant_{raw_name}"
    company_data = dict(company_data)
    company_data['db_name'] = db_name

    if Company.objects.filter(db_name=db_name).exists():
        raise ValueError("A company with this tenant database already exists. Delete or rename the existing tenant first.")

    if tenant_database_exists(db_name):
        raise ValueError("Tenant database already exists in PostgreSQL. Delete the old tenant completely or use a different company name.")

    # 2. Create Physical DB
    create_tenant_database(db_name)
    try:
        # 3. Save Company Record in Master DB
        with transaction.atomic():
            company = Company.objects.create(**company_data)

        # 4. Run Django Migrations for the new CRM schema
        run_tenant_migrations(db_name)

        # 5. Create default Admin credential
        admin_password = generate_secure_password()
        admin_email = f"admin@{company_data['company_name'].lower().replace(' ','')}.com"
        if 'company_email' in company_data and company_data['company_email']:
            admin_email = company_data['company_email']

        create_or_reset_tenant_admin(db_name, admin_email, admin_password)
        return company, admin_email, admin_password
    except Exception:
        drop_tenant_database(db_name)
        Company.objects.filter(db_name=db_name).delete()
        raise
    
def deactivate_company(company_id):
    company = Company.objects.get(id=company_id)
    company.status = 'Inactive'
    company.save()
    return company

def activate_company(company_id):
    company = Company.objects.get(id=company_id)
    company.status = 'Active'
    company.save()
    return company


def delete_company_and_tenant(company_id):
    company = Company.objects.get(id=company_id)
    db_name = company.db_name

    if db_name and tenant_database_exists(db_name):
        drop_tenant_database(db_name)

    company.delete()

    settings.DATABASES.pop(db_name, None)


def get_company_usage_stats(company):
    """
    Returns tenant usage metrics for the admin panel.
    Falls back to zeroes if the tenant DB is unavailable.
    """
    stats = {
        "total_crm_users": 0,
        "total_leads": 0,
        "storage_used_mb": 0.0,
    }

    try:
        configure_tenant_database_in_settings(company.db_name)
        user_model = get_user_model()
        stats["total_crm_users"] = user_model.objects.using(company.db_name).filter(is_active=True).count()
        stats["total_leads"] = Lead.objects.using(company.db_name).count()
        stats["storage_used_mb"] = round(get_database_size_in_mb(company.db_name), 2)
    except Exception:
        return stats

    return stats


def get_database_size_in_mb(db_name):
    conn = psycopg2.connect(
        dbname='postgres',
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        host=settings.DB_HOST,
        port=settings.DB_PORT
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT pg_database_size(%s)", [db_name])
            size_bytes = cursor.fetchone()[0] or 0
    finally:
        conn.close()

    return size_bytes / (1024 * 1024)
