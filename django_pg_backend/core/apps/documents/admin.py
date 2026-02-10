from django.contrib import admin
from .models import Document

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'uploaded_by', 'owner', 'created_at')
    list_filter = ('document_type',)
    search_fields = ('title', 'uploaded_by__full_name', 'owner__full_name')
