from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CampaignAttachmentDetailAPIView, CampaignViewSet

router = DefaultRouter(trailing_slash=False)
router.register("campaigns", CampaignViewSet, basename="campaign")

urlpatterns = [
    *router.urls,
    path("attachments/<int:attachment_id>/", CampaignAttachmentDetailAPIView.as_view(), name="campaign-attachment-detail"),
    path(
        "campaign-attachments/<int:attachment_id>/",
        CampaignAttachmentDetailAPIView.as_view(),
        name="campaign-attachment-detail-alt",
    ),
]
