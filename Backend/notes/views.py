from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import LeadNote
from .serializers import LeadNoteSerializer


class LeadNoteViewSet(ReadOnlyModelViewSet):
    queryset = LeadNote.objects.select_related("lead", "created_by").all()
    serializer_class = LeadNoteSerializer
    permission_classes = [IsAuthenticated]
