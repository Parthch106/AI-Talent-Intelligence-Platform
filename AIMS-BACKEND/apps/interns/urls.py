from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InternProfileViewSet, CreateInternView, DepartmentInternsView, AllInternsByDepartmentView, MyProfileView, AvailableInternsView, AssignInternView, ProfileByUserIdView, BulkUploadInternsView, DeleteInternView

router = DefaultRouter()
router.register(r'profiles', InternProfileViewSet, basename='intern-profile')

urlpatterns = [
    path('', include(router.urls)),
    path('create/', CreateInternView.as_view(), name='create-intern'),
    path('bulk-upload/', BulkUploadInternsView.as_view(), name='bulk-upload-interns'),
    path('department-interns/', DepartmentInternsView.as_view(), name='department-interns'),
    path('all-by-department/', AllInternsByDepartmentView.as_view(), name='all-interns-by-department'),
    path('my-profile/', MyProfileView.as_view(), name='my-profile'),
    path('available-interns/', AvailableInternsView.as_view(), name='available-interns'),
    path('assign-intern/', AssignInternView.as_view(), name='assign-intern'),
    path('profile-by-user/<int:user_id>/', ProfileByUserIdView.as_view(), name='profile-by-user'),
    path('<int:intern_id>/delete/', DeleteInternView.as_view(), name='delete-intern'),
]
