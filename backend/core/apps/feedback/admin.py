from django.contrib import admin
from .models import Feedback

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'reviewer', 'feedback_type', 'rating', 'created_at')
    list_filter = ('feedback_type', 'rating')
    search_fields = ('recipient__full_name', 'reviewer__full_name')
