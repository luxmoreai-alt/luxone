from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Account
from .serializers import AccountSerializer


class AccountViewSet(ReadOnlyModelViewSet):
    queryset = Account.objects.select_related("owner").all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
