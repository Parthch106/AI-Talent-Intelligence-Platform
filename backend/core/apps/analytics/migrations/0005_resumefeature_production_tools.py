# Generated migration for production_tools_percentage field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0004_weeklyreport_pdf_report'),
    ]

    operations = [
        migrations.AddField(
            model_name='resumefeature',
            name='production_tools_percentage',
            field=models.JSONField(
                default=dict,
                help_text='Production tools usage breakdown (percentage, tools_found, categories)'
            ),
        ),
    ]
