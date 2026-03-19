from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ProjectAssignmentViewSet, ProjectModuleViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='projects')
router.register(r'assignments', ProjectAssignmentViewSet, basename='assignments')
router.register(r'modules', ProjectModuleViewSet, basename='modules')

urlpatterns = [
    path('', include(router.urls)),
]
