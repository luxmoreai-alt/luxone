from rest_framework.routers import DefaultRouter

from .views import LeadNoteViewSet

router = DefaultRouter(trailing_slash=False)
router.register("lead-notes", LeadNoteViewSet, basename="lead-note")

urlpatterns = router.urls
