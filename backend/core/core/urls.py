from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("apps.accounts.urls")),
    path("interns/", include("apps.interns.urls")),
    path("projects/", include("apps.projects.urls")),
    path("analytics/", include("apps.analytics.urls")),
    path("assessments/", include("apps.assessments.urls")),
    path("feedback/", include("apps.feedback.urls")),
    path("documents/", include("apps.documents.urls")),
    path("notifications/", include("apps.notifications.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
