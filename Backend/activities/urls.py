from rest_framework.routers import DefaultRouter

from .views import LeadActivityViewSet

router = DefaultRouter(trailing_slash=False)
router.register("lead-activities", LeadActivityViewSet, basename="lead-activity")

urlpatterns = router.urls
