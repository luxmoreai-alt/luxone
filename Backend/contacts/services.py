from .models import Contact


def create_contact_from_lead(*, lead, account, owner=None):
    return Contact.objects.create(
        account=account,
        first_name=lead.first_name,
        last_name=lead.last_name,
        title=lead.title,
        email=lead.email,
        secondary_email=lead.secondary_email,
        phone=lead.phone,
        mobile=lead.mobile,
        owner=lead.owner or owner,
    )
