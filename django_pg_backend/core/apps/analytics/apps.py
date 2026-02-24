from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.analytics"

    def ready(self):
        """Import signals when the app is ready."""
        import apps.analytics.signals  # noqa: F401
        
        # Connect TaskTracking signals after all models are loaded
        from apps.analytics.signals import connect_task_tracking_signals
        connect_task_tracking_signals()
