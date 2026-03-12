from rest_framework.routers import DefaultRouter

from .views import DealViewSet

router = DefaultRouter(trailing_slash=False)
router.register("deals", DealViewSet, basename="deal")

urlpatterns = router.urls
