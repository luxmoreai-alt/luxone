import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("activities", "0014_call"),
        ("organizations", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # organization FK on Task
        migrations.AddField(
            model_name="task",
            name="organization",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tasks",
                to="organizations.organization",
            ),
        ),
        # assigned_to: who should work on this task
        migrations.AddField(
            model_name="task",
            name="assigned_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_tasks",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # assigned_by: who delegated this task (audit trail)
        migrations.AddField(
            model_name="task",
            name="assigned_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="delegated_tasks",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # updated indexes
        migrations.AddIndex(
            model_name="task",
            index=models.Index(
                fields=["assigned_to", "created_at"],
                name="activities__assigne_created_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="task",
            index=models.Index(
                fields=["organization", "created_at"],
                name="activities__org_created_idx",
            ),
        ),
    ]
