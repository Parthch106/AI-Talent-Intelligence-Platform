from django.urls import path
from .views import (
    NotificationListView, NotificationMarkReadView, NotificationDeleteView,
    ActivityLogView, DashboardNotificationsView, NotificationCreateTestView
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications'),
    path('mark-read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('delete/', NotificationDeleteView.as_view(), name='notification-delete'),
    path('activity/', ActivityLogView.as_view(), name='activity-log'),
    path('dashboard/', DashboardNotificationsView.as_view(), name='dashboard-notifications'),
    path('test/', NotificationCreateTestView.as_view(), name='notification-test'),
]
