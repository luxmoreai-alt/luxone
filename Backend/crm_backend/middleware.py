import threading

_thread_local = threading.local()

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
            set_current_db_name(tenant_db)

        response = self.get_response(request)
        
        set_current_db_name('default')
        
        return response
