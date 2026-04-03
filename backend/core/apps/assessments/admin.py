from django.contrib import admin
from .models import Assessment, AssessmentSubmission

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'assessment_type', 'created_by')
    list_filter = ('assessment_type',)

@admin.register(AssessmentSubmission)
class AssessmentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('intern', 'assessment', 'score', 'submitted_at')
    list_filter = ('assessment',)
