from .models import Account


def create_account_from_lead(*, lead, owner=None):
    return Account.objects.create(
        name=lead.company,
        website=lead.website,
        phone=lead.phone,
        industry=lead.industry,
        annual_revenue=lead.annual_revenue,
        employee_count=lead.employee_count,
        owner=lead.owner or owner,
        street=lead.street,
        city=lead.city,
        state=lead.state,
        country=lead.country,
        zip_code=lead.zip_code,
    )
