from django.contrib import admin
from .models import Project, ProjectAssignment

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'start_date', 'mentor')
    search_fields = ('name', 'description')
    list_filter = ('status',)

@admin.register(ProjectAssignment)
class ProjectAssignmentAdmin(admin.ModelAdmin):
    list_display = ('project', 'intern', 'role', 'status')
    list_filter = ('status', 'project')
