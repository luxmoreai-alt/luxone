import threading
import traceback
from django.conf import settings
from django.http import JsonResponse

_thread_local = threading.local()
_bootstrapped_tenant_dbs = set()
_bootstrapped_lock = threading.Lock()

def get_current_db_name():
    """Retrieves the current database name for this thread."""
    return getattr(_thread_local, 'db_name', 'default')

def set_current_db_name(db_name):
    """Sets the database name for the current thread."""
    _thread_local.db_name = db_name

class TenantMiddleware:
    """
    Middleware that captures tenant identifying headers or allows 
    the system to dynamically set the DB context.
    
    In a fully operational system, the frontend (CRM) could pass `X-Tenant-Domain` 
    or similar, and we look up the DB here. Or, the login view itself can intercept 
    the email, find the DB, and set it.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Reset to default DB on each request
        set_current_db_name('default')
        
        tenant_db = request.headers.get('X-Tenant-DB')
        if tenant_db:
            with _bootstrapped_lock:
                if tenant_db not in _bootstrapped_tenant_dbs:
                    # Re-register active tenant databases after server restarts
                    # and optionally apply migrations once in local development.
                    from django.core.management import call_command
                    from saas_admin.models import Company
                    from saas_admin.services import configure_tenant_database_in_settings

                    if Company.objects.filter(status="Active", db_name=tenant_db).exists():
                        configure_tenant_database_in_settings(tenant_db)
                        if getattr(settings, "AUTO_MIGRATE_TENANTS", False):
                            call_command("migrate", database=tenant_db, interactive=False, verbosity=0)
                        _bootstrapped_tenant_dbs.add(tenant_db)

            if tenant_db in getattr(settings, "DATABASES", {}):
                set_current_db_name(tenant_db)
            else:
                set_current_db_name('default')
        else:
            set_current_db_name('default')

        try:
            response = self.get_response(request)
        except Exception as exc:
            set_current_db_name('default')
            if settings.DEBUG and request.path.startswith("/api/"):
                return JsonResponse(
                    {
                        "detail": str(exc) or exc.__class__.__name__,
                        "exception_type": exc.__class__.__name__,
                        "path": request.path,
                        "traceback": traceback.format_exc(),
                    },
                    status=500,
                )
            raise
        
        set_current_db_name('default')
        
        return response
