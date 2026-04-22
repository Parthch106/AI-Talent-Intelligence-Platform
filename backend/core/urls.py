from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def spa_catch_all(request, *args, **kwargs):
    """
    Catch-all view for frontend SPA routes.
    During development, the frontend is served by Vite on port 5173.
    In production, build the frontend and configure Django to serve the dist/index.html.
    """
    return JsonResponse({
        'error': 'Frontend route not handled by Django.',
        'detail': (
            'You are accessing a frontend (React) route directly via the Django backend. '
            'During development, please use the Vite dev server at http://localhost:5173. '
            'In production, build the frontend with `npm run build` and configure Django to serve the static files.'
        ),
        'frontend_url': f'http://localhost:5173{request.path}',
    }, status=404)


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

# Catch-all for SPA routes — must be LAST
urlpatterns += [
    re_path(r'^(?!api/|admin/|accounts/|interns/|projects/|analytics/|assessments/|feedback/|documents/|notifications/|media/|static/).*$', spa_catch_all),
]
