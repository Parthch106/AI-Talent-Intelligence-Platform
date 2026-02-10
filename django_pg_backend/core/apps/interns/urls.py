from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InternProfileViewSet, CreateInternView

router = DefaultRouter()
router.register(r'profiles', InternProfileViewSet, basename='intern-profile')

urlpatterns = [
    path('', include(router.urls)),
    path('create/', CreateInternView.as_view(), name='create-intern'),
]
