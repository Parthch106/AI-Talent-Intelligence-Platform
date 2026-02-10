from django.urls import path
from .views import DashboardStatsView

urlpatterns = [
    path('summary/', DashboardStatsView.as_view(), name='dashboard-summary'),
]
