from rest_framework import serializers

from accounts.serializers import UsersSerializer
from .models import FriendRequests


class FriendListSerializer(serializers.ModelSerializer):
    friend_request = UsersSerializer(read_only=True)
    request_intra_id = serializers.CharField(source="request_user_id.intra_id")
    response_intra_id = serializers.CharField(source="response_user_id.intra_id")

    class Meta:
        model = FriendRequests
        fields = (
            "request_id",
            "request_intra_id",
            "response_intra_id",
            "status",
            "friend_request",
        )


class FriendRequestSerializer(serializers.ModelSerializer):
    friend_request = UsersSerializer(read_only=True)

    class Meta:
        model = FriendRequests
        fields = (
            "request_id",
            "request_user_id",
            "response_user_id",
            "friend_request",
        )


class FriendRequestDetailSerializer(serializers.ModelSerializer):
    friend_request = UsersSerializer(read_only=True)

    class Meta:
        model = FriendRequests
        fields = (
            "status",
            "friend_request",
        )
