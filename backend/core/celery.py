import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

app = Celery('talent_platform')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

app.conf.beat_schedule = {
    # ── Phase 3: Weekly report generation (every Monday 8:00 AM) ────────────
    'generate-weekly-reports-v2': {
        'task':     'apps.analytics.tasks.generate_weekly_reports_v2',
        'schedule': crontab(hour=8, minute=0, day_of_week='monday'),
    },

    # ── Phase 5: ConversionScore update (every Monday 9:00 AM) ─────────────
    # Registered now as stubs.
    'update-conversion-scores': {
        'task':     'apps.analytics.tasks.update_all_conversion_scores',
        'schedule': crontab(hour=9, minute=0, day_of_week='monday'),
    },

    # ── Phase 5: Phase transition eligibility check (daily midnight) ────────
    'check-phase-transitions': {
        'task':     'apps.analytics.tasks.check_phase_transition_eligibility',
        'schedule': crontab(hour=0, minute=0),
    },

    # ── Phase 6: Offer Expiry Automation (daily 1:00 AM) ─────────────────────
    'expire-pending-offers': {
        'task':     'apps.accounts.tasks.expire_pending_offers',
        'schedule': crontab(hour=1, minute=0),
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
