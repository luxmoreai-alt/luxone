from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from django.contrib.auth import get_user_model

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
        qs = Task.objects.select_related("owner", "assigned_to", "assigned_by", "contact", "account")
        user_id = self.request.query_params.get("user_id")
        if user_id and getattr(user, "role", "employee") in ("admin", "manager"):
            from django.db import models as dm
            qs = qs.filter(dm.Q(owner_id=user_id) | dm.Q(assigned_to_id=user_id))
        return qs

    def _validate_assignment(self, assigner, assigned_to):
        if assigned_to is None:
            return
        role = getattr(assigner, "role", "employee")
        if role in ("admin", "sub_admin"):
            return
        if role in ("manager", "team_lead"):
            User = get_user_model()
            team_ids = list(User.objects.filter(manager=assigner, is_active=True).values_list("id", flat=True))
            if assigned_to.pk != assigner.pk and assigned_to.pk not in team_ids:
                raise PermissionDenied(detail="Managers can only assign to their direct reports.")
            return
        if assigned_to.pk != assigner.pk:
            raise PermissionDenied(detail="Employees can only assign tasks to themselves.")

    def perform_create(self, serializer):
        user = self.request.user
        assigned_to = serializer.validated_data.get("assigned_to")

        self._validate_assignment(user, assigned_to)

        save_kwargs = {"owner": user}
        if assigned_to and assigned_to.pk != user.pk:
            save_kwargs["assigned_by"] = user
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
        User = get_user_model()
        role = getattr(request.user, "role", "employee")
        if role in ("admin", "sub_admin"):
            users = User.objects.filter(is_active=True).values("id", "email")
        elif role in ("manager", "team_lead"):
            team_ids = list(User.objects.filter(manager=request.user, is_active=True).values_list("id", flat=True))
            team_ids.append(request.user.pk)
            users = User.objects.filter(pk__in=team_ids, is_active=True).values("id", "email")
        else:
            users = User.objects.filter(pk=request.user.pk).values("id", "email")
        return Response(list(users), status=status.HTTP_200_OK)


class MeetingViewSet(ModelViewSet):
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Meeting.objects.select_related("organizer", "lead", "contact", "account", "deal")

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)


class CallViewSet(ModelViewSet):
    serializer_class = CallSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_qs = Call.objects.select_related("owner", "lead", "contact", "account", "deal")
        user_org = getattr(user, "organization_id", None)
        if not user_org:
            return base_qs.all()
        visible_user_ids = get_visible_user_ids(user)
        return base_qs.filter(
            owner_id__in=visible_user_ids,
            owner__organization_id=user_org,
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
