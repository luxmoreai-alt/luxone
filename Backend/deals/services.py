from .models import Deal


def create_deal_from_lead(*, lead, account, contact, owner=None, deal_name=None, deal_value=None):
    return Deal.objects.create(
        account=account,
        contact=contact,
        lead=lead,
        name=deal_name or f"{lead.company} Opportunity",
        stage=Deal.DealStage.QUALIFICATION,
        amount=deal_value,
        value=deal_value,
        owner=lead.owner or owner,
    )
