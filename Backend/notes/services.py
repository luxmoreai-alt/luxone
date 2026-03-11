from .models import LeadNote


def create_note(*, lead, note, created_by=None):
    return LeadNote.objects.create(
        lead=lead,
        note=note,
        created_by=created_by,
    )
