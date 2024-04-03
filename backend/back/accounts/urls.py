from django.urls import path
from . import views
from .views import logout_view

urlpatterns = [
    path("me/", views.MeViewSet.as_view({"get": "list"}), name="me"),
    path(
        "users/",
        views.UsersViewSet.as_view({"get": "list", "post": "create"}),
        name="users",
    ),
    path(
        "users/<str:intra_id>/",
        views.UsersDetailViewSet.as_view({"get": "list", "patch": "partial_update"}),
        name="users_detail",
    ),
    path("login/", views.Login42APIView.as_view()),
    path("login/42/callback/", views.CallbackAPIView.as_view()),
    path("logout/", logout_view, name="logout"),
    # TODO test용 삭제
    path("login/<str:intra_id>/", views.TestAccountLogin.as_view()),
]
