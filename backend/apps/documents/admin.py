from django.contrib import admin
from .models import Document, ResumeData

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'uploaded_by', 'owner', 'created_at', 'is_parsed')
    list_filter = ('document_type', 'is_parsed')
    search_fields = ('title', 'uploaded_by__full_name', 'owner__full_name')


@admin.register(ResumeData)
class ResumeDataAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'email', 'total_experience_years', 'parsed_at')
    list_filter = ('total_experience_years',)
    search_fields = ('user__full_name', 'user__email', 'name', 'email')
    readonly_fields = ('parsed_at', 'updated_at')
