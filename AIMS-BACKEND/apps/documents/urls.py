from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, ResumeDataViewSet

router = DefaultRouter()
router.register(r'files', DocumentViewSet, basename='documents')
router.register(r'resume-data', ResumeDataViewSet, basename='resume-data')

urlpatterns = [
    path('', include(router.urls)),
]
