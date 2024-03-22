from rest_framework import serializers
from .models import Users


class UsersSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = (
            "user_id",
            "intra_id",
            "nickname",
            "profile_image",
            "win_count",
            "lose_count",
            "status",
        )


class UsersDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Users
        fields = (
            "user_id",
            "nickname",
            "profile_image",
            "win_count",
            "lose_count",
            "status",
            "intra_id",
            "created_time",
            "updated_time",
        )
