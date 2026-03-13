from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import ContactViewSet

router = DefaultRouter(trailing_slash=False)
router.register("contacts", ContactViewSet, basename="contact")

contact_import_view = ContactViewSet.as_view({"post": "import_records"})

urlpatterns = [*router.urls, path("contact/import", contact_import_view)]
