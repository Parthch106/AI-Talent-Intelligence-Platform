from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeedbackViewSet, TaskCommentViewSet

router = DefaultRouter()
router.register(r'task-comments', TaskCommentViewSet, basename='task-comment')
router.register(r'', FeedbackViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
