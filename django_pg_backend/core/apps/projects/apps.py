from django.apps import AppConfig


class ProjectsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.projects'

    def ready(self):
        import apps.projects.signals
        
        # Connect ProjectAssignment signals after all models are loaded
        from apps.projects.signals import connect_project_assignment_signals
        connect_project_assignment_signals()
