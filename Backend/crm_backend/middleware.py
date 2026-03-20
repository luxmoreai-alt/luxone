import traceback
from django.conf import settings
from django.http import JsonResponse


class TenantMiddleware:
    """Simple middleware — single database, no tenant routing."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
        except Exception as exc:
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
        return response
