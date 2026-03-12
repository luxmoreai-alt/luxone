from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Deal
from .serializers import DealSerializer


class DealViewSet(ReadOnlyModelViewSet):
    queryset = Deal.objects.select_related("account", "contact", "lead", "owner").all()
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]
