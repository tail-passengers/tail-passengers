from django.urls import path
from . import views

urlpatterns = [
    path(
        "friend_requests/<str:intra_id>/<str:status>/",
        views.FriendListViewSet.as_view({"get": "list"}),
        name="friend_list",
    ),
    path(
        "friend_requests/",
        views.FriendRequestViewSet.as_view(
            {
                "post": "create",
            }
        ),
        name="friend_requests",
    ),
    path(
        "friend_requests/<uuid:request_id>/",
        views.FriendRequestDetailViewSet.as_view(
            {
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="friend_requests_detail",
    ),
]
