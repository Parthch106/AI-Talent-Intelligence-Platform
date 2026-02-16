from django.urls import path
from .views import NotificationListView, NotificationMarkReadView, ActivityLogView, DashboardNotificationsView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications'),
    path('mark-read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('activity/', ActivityLogView.as_view(), name='activity-log'),
    path('dashboard/', DashboardNotificationsView.as_view(), name='dashboard-notifications'),
]
