from django.urls import path
from .views import RegisterView, LoginView, AdminOnlyView, ManagerOnlyView, InternOnlyView

urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="register"),
    path("auth/login", LoginView.as_view(), name="login"),

    # test permission routes
    path("test/admin", AdminOnlyView.as_view()),
    path("test/manager", ManagerOnlyView.as_view()),
    path("test/intern", InternOnlyView.as_view()),
]
