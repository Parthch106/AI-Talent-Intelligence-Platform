from django.urls import path
from .views import RegisterView, LoginView, AdminOnlyView, ManagerOnlyView, InternOnlyView, UserProfileView, ChangePasswordView, UserListView

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="register"),
    path("auth/login", LoginView.as_view(), name="login"),

    # Profile endpoints
    path("users/me/", UserProfileView.as_view(), name="user-profile"),
    path("profile/", UserProfileView.as_view(), name="user-profile-alt"),  # Alias for frontend compatibility
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/", UserListView.as_view(), name="user-list"),

    # test permission routes
    path("test/admin", AdminOnlyView.as_view()),
    path("test/manager", ManagerOnlyView.as_view()),
    path("test/intern", InternOnlyView.as_view()),
]
