from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from organizations.services import (
    can_assign_to_user,
    filter_queryset_by_access,
    get_assignable_users,
)

from .models import LeadActivity, Task, Meeting, Call
from .serializers import LeadActivitySerializer, TaskSerializer, MeetingSerializer, CallSerializer


class LeadActivityViewSet(ReadOnlyModelViewSet):
    queryset = LeadActivity.objects.select_related("lead", "user").all()
    serializer_class = LeadActivitySerializer
    permission_classes = [IsAuthenticated]


class TaskViewSet(ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_qs = Task.objects.select_related(
            "owner", "assigned_to", "assigned_by", "contact", "account", "organization"
        )
        qs = filter_queryset_by_access(
            base_qs, user,
            owner_field="owner",
            assigned_field="assigned_to",
        )
        # Admin/manager can filter tasks by specific user
        user_id = self.request.query_params.get("user_id")
        if user_id and getattr(user, "role", "employee") in ("admin", "manager"):
            from django.db import models as dm
            qs = qs.filter(dm.Q(owner_id=user_id) | dm.Q(assigned_to_id=user_id))
        return qs

    def _validate_assignment(self, assigner, assigned_to):
        """Raises PermissionDenied if assigner cannot assign to assigned_to."""
        if assigned_to is None:
            return
        allowed, reason = can_assign_to_user(assigner, assigned_to)
        if not allowed:
            raise PermissionDenied(detail=reason)

    def perform_create(self, serializer):
        user = self.request.user
        assigned_to = serializer.validated_data.get("assigned_to")

        self._validate_assignment(user, assigned_to)

        save_kwargs = {"owner": user}

        # Set assigned_by only when someone else is being assigned
        if assigned_to and assigned_to.pk != user.pk:
            save_kwargs["assigned_by"] = user

        # Auto-fill organization from the creating user
        if not serializer.validated_data.get("organization") and getattr(user, "organization_id", None):
            save_kwargs["organization_id"] = user.organization_id

        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        user = self.request.user
        assigned_to = serializer.validated_data.get(
            "assigned_to", serializer.instance.assigned_to
        )
        self._validate_assignment(user, assigned_to)

        save_kwargs = {}
        current_assigned = serializer.instance.assigned_to
        # Update assigned_by only if assigned_to is changing
        if assigned_to != current_assigned and assigned_to and assigned_to.pk != user.pk:
            save_kwargs["assigned_by"] = user

        serializer.save(**save_kwargs)

    @action(detail=False, methods=["get"], url_path="assignable-users")
    def assignable_users(self, request):
        """
        Returns the list of users the current user may assign tasks to.
        Frontend can use this to populate the 'Assign To' dropdown.
        """
        users = get_assignable_users(request.user).values("id", "email")
        return Response(list(users), status=status.HTTP_200_OK)


class MeetingViewSet(ModelViewSet):
    queryset = Meeting.objects.select_related("organizer", "lead", "contact", "account", "deal").all()
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class CallViewSet(ModelViewSet):
    queryset = Call.objects.select_related("owner", "lead", "contact", "account", "deal").all()
    serializer_class = CallSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
