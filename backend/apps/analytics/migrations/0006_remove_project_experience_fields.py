# Migration to remove Project & Experience Depth fields and clarity_structure_score

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0005_resumefeature_production_tools'),
    ]

    operations = [
        # Remove Project & Experience Depth fields
        migrations.RemoveField(
            model_name='resumefeature',
            name='practical_exposure_score',
        ),
        migrations.RemoveField(
            model_name='resumefeature',
            name='problem_solving_depth_score',
        ),
        migrations.RemoveField(
            model_name='resumefeature',
            name='project_complexity_score',
        ),
        migrations.RemoveField(
            model_name='resumefeature',
            name='production_tools_usage_score',
        ),
        # Remove clarity_structure_score
        migrations.RemoveField(
            model_name='resumefeature',
            name='clarity_structure_score',
        ),
    ]
