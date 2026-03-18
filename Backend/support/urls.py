from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    SupportCaseViewSet,
    SupportLookupAPIView,
    SupportQuickCreateProductAPIView,
    SupportSolutionViewSet,
)

router = DefaultRouter(trailing_slash=False)
router.register(r"cases", SupportCaseViewSet, basename="case")
router.register(r"solutions", SupportSolutionViewSet, basename="solution")
router.register(r"support/cases", SupportCaseViewSet, basename="support-case")
router.register(r"support/solutions", SupportSolutionViewSet, basename="support-solution")

urlpatterns = [
    *router.urls,
    path("support/lookups/<str:lookup_name>", SupportLookupAPIView.as_view(), name="support-lookup"),
    path("support/products/quick-create", SupportQuickCreateProductAPIView.as_view(), name="support-product-quick-create"),
]
