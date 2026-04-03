from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssessmentViewSet, AssessmentSubmissionViewSet

router = DefaultRouter()
router.register(r'', AssessmentViewSet)
router.register(r'submissions', AssessmentSubmissionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
