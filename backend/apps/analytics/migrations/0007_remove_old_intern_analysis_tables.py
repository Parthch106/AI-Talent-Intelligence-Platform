"""
Migration to remove old intern analysis tables.
These are being replaced by the new schema defined in INTERN_ANALYSIS_SCHEMA.md
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0006_remove_project_experience_fields'),
    ]

    operations = [
        # Delete the old intern analysis tables
        migrations.DeleteModel(
            name='RoleRequirement',
        ),
        migrations.DeleteModel(
            name='InternIntelligence',
        ),
        migrations.DeleteModel(
            name='ResumeFeature',
        ),
        migrations.DeleteModel(
            name='AnalyticsSnapshot',
        ),
    ]
