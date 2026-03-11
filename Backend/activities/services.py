from .models import LeadActivity


def create_lead_activity(*, lead, action, description="", user=None):
    return LeadActivity.objects.create(
        lead=lead,
        action=action,
        description=description,
        user=user,
    )
