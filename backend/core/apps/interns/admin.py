from django.contrib import admin
from .models import InternProfile

try:
    admin.site.unregister(InternProfile)
except admin.sites.NotRegistered:
    pass

@admin.register(InternProfile)
class InternProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'university', 'status', 'gpa')
    search_fields = ('user__email', 'user__full_name', 'university')
    list_filter = ('status', 'graduation_year')

