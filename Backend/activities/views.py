from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import LeadActivity
from .serializers import LeadActivitySerializer


class LeadActivityViewSet(ReadOnlyModelViewSet):
    queryset = LeadActivity.objects.select_related("lead", "user").all()
    serializer_class = LeadActivitySerializer
    permission_classes = [IsAuthenticated]
