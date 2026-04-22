from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, StaffRegisterView, LoginView, AdminOnlyView, ManagerOnlyView, InternOnlyView, 
    UserProfileView, ChangePasswordView, UserListView, StipendRecordViewSet,
    InternOffboardView, PasswordResetRequestView, PasswordResetVerifyOTPView, PasswordResetConfirmView,
    DepartmentListView
)

router = DefaultRouter()
router.register(r'admin/stipend', StipendRecordViewSet, basename='admin-stipend')
router.register(r'stipends',      StipendRecordViewSet, basename='intern-stipend')

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/staff/register/", StaffRegisterView.as_view(), name="staff-register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("auth/password-reset/verify/", PasswordResetVerifyOTPView.as_view(), name="password-reset-verify"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),

    # Profile endpoints
    path("users/me/", UserProfileView.as_view(), name="user-profile"),
    path("profile/", UserProfileView.as_view(), name="user-profile-alt"),  # Alias for frontend compatibility
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("departments/", DepartmentListView.as_view(), name="department-list"),
    path('admin/interns/<int:intern_id>/offboard/', InternOffboardView.as_view(), name='intern-offboard'),

    # Router endpoints
    path("", include(router.urls)),

    # test permission routes
    path("test/admin", AdminOnlyView.as_view()),
    path("test/manager", ManagerOnlyView.as_view()),
    path("test/intern", InternOnlyView.as_view()),
]
