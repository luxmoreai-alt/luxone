from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import AccountAttachmentDetailAPIView, AccountViewSet

router = DefaultRouter(trailing_slash=False)
router.register("accounts", AccountViewSet, basename="account")

urlpatterns = [
    *router.urls,
    path("attachments/<int:attachment_id>/", AccountAttachmentDetailAPIView.as_view(), name="account-attachment-detail"),
]
