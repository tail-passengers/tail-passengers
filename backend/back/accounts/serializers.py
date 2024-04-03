from rest_framework import serializers
from .models import Users


class UsersSerializer(serializers.ModelSerializer):
    class Meta:
        model: Users = Users
        fields: tuple = (
            "user_id",
            "intra_id",
            "nickname",
            "profile_image",
            "win_count",
            "lose_count",
            "status",
            "house",
        )


class UsersDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model: Users = Users
        fields: tuple = (
            "user_id",
            "nickname",
            "profile_image",
            "win_count",
            "lose_count",
            "status",
            "intra_id",
            "created_time",
            "updated_time",
            "house",
        )
