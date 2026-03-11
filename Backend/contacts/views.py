from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Contact
from .serializers import ContactSerializer


class ContactViewSet(ReadOnlyModelViewSet):
    queryset = Contact.objects.select_related("account", "owner").all()
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]
