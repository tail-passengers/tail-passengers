from rest_framework import serializers
from accounts.serializers import UsersSerializer
from .models import FriendRequests


class FriendListSerializer(serializers.ModelSerializer):
    request_user_id: UsersSerializer = UsersSerializer(read_only=True)
    response_user_id: UsersSerializer = UsersSerializer(read_only=True)
    request_intra_id: str = serializers.CharField(source="request_user_id.intra_id")
    response_intra_id: str = serializers.CharField(source="response_user_id.intra_id")

    class Meta:
        model: FriendRequests = FriendRequests
        fields: tuple[str] = (
            "request_id",
            "request_intra_id",
            "response_intra_id",
            "status",
            "request_user_id",
            "response_user_id",
        )


class FriendRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model: FriendRequests = FriendRequests
        fields: tuple[str] = (
            "request_id",
            "request_user_id",
            "response_user_id",
        )


class FriendRequestDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model: FriendRequests = FriendRequests
        fields: tuple[str] = (
            "status",
        )
