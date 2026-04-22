"""
V2 Schema Upgrade Migration
============================
Implements INTERN_ANALYSIS_SCHEMA_V2.md changes:

1. Delete InternIntelligence model (legacy Phase 1)
2. Update JobRole: add role_embedding (JSONField)
3. Update Application: rename resume_text → resume_raw_text, status → application_status, application_date → created_at
4. Delete ResumeFeature (replaced by 3 new tables)
5. Create ResumeSection (parsed text store)
6. Create ResumeEmbedding (vector store)
7. Create StructuredFeature (engineered ML inputs)
8. Update ModelPrediction: V2 scores (technical_score, growth_score, authenticity_score, semantic_match_score, model_type)
9. Delete AuthenticityReview (handled by authenticity_score in predictions)
"""

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('analytics', '0010_remove_task_tracking_complexity'),
    ]

    operations = [
        # =====================================================================
        # 1. Delete InternIntelligence (Legacy Phase 1)
        # =====================================================================
        migrations.DeleteModel(
            name='InternIntelligence',
        ),

        # =====================================================================
        # 2. Update JobRole: add role_embedding
        # =====================================================================
        migrations.AddField(
            model_name='jobrole',
            name='role_embedding',
            field=models.JSONField(
                blank=True,
                null=True,
                help_text='Role embedding vector for semantic matching (pgvector compatible)',
            ),
        ),

        # =====================================================================
        # 3. Update Application: rename fields
        # =====================================================================
        migrations.RenameField(
            model_name='application',
            old_name='resume_text',
            new_name='resume_raw_text',
        ),
        migrations.RenameField(
            model_name='application',
            old_name='status',
            new_name='application_status',
        ),
        migrations.RenameField(
            model_name='application',
            old_name='application_date',
            new_name='created_at',
        ),
        # Update ordering to use new field name
        migrations.AlterModelOptions(
            name='application',
            options={
                'ordering': ['-created_at'],
                'verbose_name': 'Application',
                'verbose_name_plural': 'Applications',
            },
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='application',
            index=models.Index(fields=['intern'], name='idx_application_candidate'),
        ),
        migrations.AddIndex(
            model_name='application',
            index=models.Index(fields=['job_role'], name='idx_application_role'),
        ),

        # =====================================================================
        # 4. Delete ResumeFeature (V1 monolithic feature store)
        # =====================================================================
        migrations.DeleteModel(
            name='ResumeFeature',
        ),

        # =====================================================================
        # 5. Create ResumeSection (V2: parsed text store)
        # =====================================================================
        migrations.CreateModel(
            name='ResumeSection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('professional_summary', models.TextField(blank=True, help_text='Professional summary / objective section')),
                ('technical_skills', models.TextField(blank=True, help_text='Technical skills text')),
                ('tools_technologies', models.TextField(blank=True, help_text='Tools and technologies used')),
                ('frameworks_libraries', models.TextField(blank=True, help_text='Frameworks and libraries')),
                ('databases', models.TextField(blank=True, help_text='Database technologies')),
                ('cloud_platforms', models.TextField(blank=True, help_text='Cloud platforms experience')),
                ('soft_skills', models.TextField(blank=True, help_text='Soft skills mentioned')),
                ('experience_titles', models.TextField(blank=True, help_text='Job/internship titles')),
                ('experience_descriptions', models.TextField(blank=True, help_text='Experience descriptions and responsibilities')),
                ('experience_duration_text', models.TextField(blank=True, help_text='Duration text for each experience')),
                ('project_titles', models.TextField(blank=True, help_text='Project titles')),
                ('project_descriptions', models.TextField(blank=True, help_text='Project descriptions')),
                ('project_technologies', models.TextField(blank=True, help_text='Technologies used in projects')),
                ('education_text', models.TextField(blank=True, help_text='Education details')),
                ('certifications', models.TextField(blank=True, help_text='Certifications obtained')),
                ('achievements', models.TextField(blank=True, help_text='Awards and achievements')),
                ('extracurriculars', models.TextField(blank=True, help_text='Extracurricular activities')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('application', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resume_sections',
                    to='analytics.application',
                )),
            ],
            options={
                'verbose_name': 'Resume Section',
                'verbose_name_plural': 'Resume Sections',
                'ordering': ['-created_at'],
            },
        ),

        # =====================================================================
        # 6. Create ResumeEmbedding (V2: vector store)
        # =====================================================================
        migrations.CreateModel(
            name='ResumeEmbedding',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('summary_embedding', models.JSONField(blank=True, null=True, help_text='Embedding vector for professional summary')),
                ('experience_embedding', models.JSONField(blank=True, null=True, help_text='Embedding vector for experience section')),
                ('project_embedding', models.JSONField(blank=True, null=True, help_text='Embedding vector for projects section')),
                ('skills_embedding', models.JSONField(blank=True, null=True, help_text='Embedding vector for skills section')),
                ('combined_embedding', models.JSONField(blank=True, null=True, help_text='Combined embedding vector for full resume')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('application', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='resume_embeddings',
                    to='analytics.application',
                )),
            ],
            options={
                'verbose_name': 'Resume Embedding',
                'verbose_name_plural': 'Resume Embeddings',
                'ordering': ['-created_at'],
            },
        ),

        # =====================================================================
        # 7. Create StructuredFeature (V2: reduced numeric features)
        # =====================================================================
        migrations.CreateModel(
            name='StructuredFeature',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                # Role Matching
                ('skill_match_ratio', models.FloatField(default=0.0, help_text='Ratio of matched skills to required skills (0-1)')),
                ('domain_similarity_score', models.FloatField(default=0.0, help_text='Similarity between candidate domain and job domain (0-1)')),
                ('critical_skill_gap_count', models.IntegerField(default=0, help_text='Number of critical skills missing')),
                # Experience Strength
                ('experience_duration_months', models.IntegerField(default=0, help_text='Total experience in months')),
                ('internship_relevance_score', models.FloatField(default=0.0, help_text='Relevance of internship experience (0-1)')),
                ('project_complexity_score', models.FloatField(default=0.0, help_text='Complexity of projects (0-1)')),
                # Education
                ('degree_level_encoded', models.IntegerField(default=1, help_text='1=High School, 2=Bachelor, 3=Masters, 4=PhD')),
                ('gpa_normalized', models.FloatField(default=0.0, help_text='Normalized GPA score (0-1)')),
                # Resume Authenticity
                ('quantified_impact_presence', models.BooleanField(default=False, help_text='Whether resume contains quantifiable impact statements')),
                ('writing_clarity_score', models.FloatField(default=0.0, help_text='Clarity of writing (0-1)')),
                # Metadata
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('application', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='structured_features',
                    to='analytics.application',
                )),
            ],
            options={
                'verbose_name': 'Structured Feature',
                'verbose_name_plural': 'Structured Features',
                'ordering': ['-created_at'],
            },
        ),

        # =====================================================================
        # 8. Update ModelPrediction: V2 scores
        # =====================================================================
        # Remove V1 scores
        migrations.RemoveField(
            model_name='modelprediction',
            name='technical_competency_score',
        ),
        migrations.RemoveField(
            model_name='modelprediction',
            name='growth_potential_score',
        ),
        migrations.RemoveField(
            model_name='modelprediction',
            name='resume_authenticity_score',
        ),
        migrations.RemoveField(
            model_name='modelprediction',
            name='communication_score',
        ),
        migrations.RemoveField(
            model_name='modelprediction',
            name='leadership_score',
        ),
        # Add V2 scores
        migrations.AddField(
            model_name='modelprediction',
            name='technical_score',
            field=models.FloatField(default=0.0, help_text='Technical skills score (0-1)'),
        ),
        migrations.AddField(
            model_name='modelprediction',
            name='growth_score',
            field=models.FloatField(default=0.0, help_text='Growth potential score (0-1)'),
        ),
        migrations.AddField(
            model_name='modelprediction',
            name='authenticity_score',
            field=models.FloatField(default=0.0, help_text='Resume authenticity score (0-1)'),
        ),
        migrations.AddField(
            model_name='modelprediction',
            name='semantic_match_score',
            field=models.FloatField(default=0.0, help_text='Semantic similarity match score (0-1)'),
        ),
        migrations.AddField(
            model_name='modelprediction',
            name='model_type',
            field=models.CharField(blank=True, max_length=50, help_text='Type of model used (e.g., XGBoost, LightGBM, Transformer)'),
        ),

        # =====================================================================
        # 9. Delete AuthenticityReview
        # =====================================================================
        migrations.DeleteModel(
            name='AuthenticityReview',
        ),
    ]
