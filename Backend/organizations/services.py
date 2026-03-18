"""
organizations/services.py

Reusable hierarchy helpers for role-based + manager-hierarchy access control.

Usage:
    from organizations.services import (
        get_team_members,
        filter_queryset_by_access,
        can_assign_to_user,
        get_visible_user_ids,
    )
"""

from django.db import models as django_models


# ── Team / hierarchy helpers ───────────────────────────────────────────────────

def get_team_members(manager_user):
    """
    Returns a QuerySet of User objects who directly report to manager_user
    (i.e., users where user.manager == manager_user, in the same org).
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.filter(
        manager=manager_user,
        organization=manager_user.organization,
        is_active=True,
    )


def get_visible_user_ids(user):
    """
    Returns the list of user PKs that `user` can see records for / assign to.

    admin   → all active users in the same organization
    manager → self + direct reports
    employee→ only self
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    user_org = getattr(user, "organization_id", None)
    if not user_org:
        # pre-migration fallback: can see everything
        return list(User.objects.filter(is_active=True).values_list("id", flat=True))

    role = getattr(user, "role", "employee")

    if role == "admin":
        return list(
            User.objects.filter(organization_id=user_org, is_active=True)
            .values_list("id", flat=True)
        )

    if role == "manager":
        team_ids = list(get_team_members(user).values_list("id", flat=True))
        team_ids.append(user.pk)
        return team_ids

    # employee
    return [user.pk]


# ── Queryset filtering ─────────────────────────────────────────────────────────

def filter_queryset_by_access(queryset, user, owner_field="owner", assigned_field=None):
    """
    Applies organization-scoped, role-based filtering to any queryset.

    Parameters
    ----------
    queryset       : the base QuerySet (e.g. Lead.objects.all())
    user           : request.user
    owner_field    : the field name that represents record ownership ("owner")
    assigned_field : optional field name for task assignment ("assigned_to").
                     If provided, records where this field matches visible users
                     are also included.

    Access rules
    ------------
    admin    → all records in user.organization
    manager  → records in org where owner OR assigned_to ∈ {self + direct reports}
    employee → records in org where owner = self OR assigned_to = self
    """
    user_org = getattr(user, "organization_id", None)

    # Backwards-compatible fallback: no org yet → return everything
    if not user_org:
        return queryset

    role = getattr(user, "role", "employee")

    # Scope to organization first
    queryset = queryset.filter(organization_id=user_org)

    if role == "admin":
        return queryset

    # manager / employee: scope by visible user IDs
    visible_ids = get_visible_user_ids(user)
    owner_in = f"{owner_field}__in"

    # Records where owner is in visible set
    q = django_models.Q(**{owner_in: visible_ids})

    if assigned_field:
        assigned_in = f"{assigned_field}__in"
        assigned_null = f"{assigned_field}__isnull"
        # Records explicitly assigned to someone in visible set
        q |= django_models.Q(**{assigned_in: visible_ids})
        # Records with no explicit assignment but owned by someone in visible set
        # (already covered by owner_in above, but kept for clarity)
        q |= django_models.Q(**{assigned_null: True}, **{owner_in: visible_ids})

    return queryset.filter(q).distinct()


# ── Assignment permission checks ───────────────────────────────────────────────

def can_assign_to_user(assigner, target_user):
    """
    Validates whether `assigner` may assign a task / record to `target_user`.

    Returns: (allowed: bool, reason: str)

    Rules
    -----
    admin    → any user in the same organization
    manager  → self or direct reports only
    employee → self only
    """
    # No org yet → backwards compatible, allow everything
    if not getattr(assigner, "organization_id", None):
        return True, ""

    if target_user.organization_id != assigner.organization_id:
        return False, "Cannot assign to users from a different organization."

    role = getattr(assigner, "role", "employee")

    if role == "admin":
        return True, ""

    if role == "manager":
        team_ids = list(get_team_members(assigner).values_list("id", flat=True))
        if target_user.pk == assigner.pk or target_user.pk in team_ids:
            return True, ""
        return False, "Managers can only assign to their direct reports."

    # employee
    if target_user.pk == assigner.pk:
        return True, ""
    return False, "Employees can only assign tasks to themselves."


# ── Users API helpers ──────────────────────────────────────────────────────────

def get_assignable_users(user):
    """
    Returns a QuerySet of users that `user` is allowed to assign tasks to.
    This is the queryset-equivalent of can_assign_to_user for dropdowns/selects.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    user_org = getattr(user, "organization_id", None)
    if not user_org:
        return User.objects.filter(is_active=True)

    role = getattr(user, "role", "employee")
    base = User.objects.filter(organization_id=user_org, is_active=True)

    if role == "admin":
        return base

    if role == "manager":
        team_ids = list(get_team_members(user).values_list("id", flat=True))
        team_ids.append(user.pk)
        return base.filter(pk__in=team_ids)

    # employee — only themselves
    return base.filter(pk=user.pk)
