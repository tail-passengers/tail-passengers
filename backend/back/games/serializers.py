from django.utils import timezone
from rest_framework import serializers
from .models import (
    GeneralGameLogs,
    TournamentGameLogs,
)
from accounts.serializers import UsersSerializer
from accounts.models import Users


def create_game_log(
    validated_data: dict, is_general: bool = True
) -> GeneralGameLogs or TournamentGameLogs:
    validated_data["player1"] = Users.objects.get(
        intra_id=validated_data["player1"]["intra_id"]
    )
    validated_data["player2"] = Users.objects.get(
        intra_id=validated_data["player2"]["intra_id"]
    )
    game_log: GeneralGameLogs or TournamentGameLogs = (
        GeneralGameLogs.objects.create(**validated_data)
        if is_general
        else TournamentGameLogs.objects.create(**validated_data)
    )
    return game_log


class GeneralGameLogsSerializer(serializers.ModelSerializer):
    player1_intra_id: str = serializers.CharField(source="player1.intra_id")
    player2_intra_id: str = serializers.CharField(source="player2.intra_id")

    class Meta:
        model: GeneralGameLogs = GeneralGameLogs
        fields = (
            "game_id",
            "start_time",
            "end_time",
            "player1_intra_id",
            "player2_intra_id",
            "player1_score",
            "player2_score",
        )

    def create(self, validated_data: dict) -> GeneralGameLogs:
        return create_game_log(validated_data)

    # winner랑 loser가 동일하면 에러 발생
    # 데이터 유효성 검사는 1. model 수준에서 2. serializer에서 가능한데
    # 1. clean을 오버라이딩해서 Django의 폼 시스템이나 관리자 사이트에서 주로 유용
    # 2. api에서 유용
    def validate(self, data: dict) -> dict:
        if data["player1"] == data["player2"]:
            raise serializers.ValidationError("Winner and loser must be different.")
        # 시작 시간이 끝나는 시간보다 이전인지 확인
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError("End time must be later than start time.")
        # 끝나는 시간이 현재 시각보다 이후인지 확인
        if data["end_time"] > timezone.now():
            raise serializers.ValidationError("End time must not be in the future.")
        if data["player1_score"] < 0 or data["player2_score"] < 0:
            raise serializers.ValidationError("Score must be a non-negative number.")
        return data


class GeneralGameLogsListSerializer(serializers.ModelSerializer):
    player1: Users = UsersSerializer()
    player2: Users = UsersSerializer()

    class Meta:
        model: GeneralGameLogs = GeneralGameLogs
        fields = (
            "game_id",
            "start_time",
            "end_time",
            "player1",
            "player2",
            "player1_score",
            "player2_score",
        )

    def create(self, validated_data: dict) -> GeneralGameLogs:
        return create_game_log(validated_data)


class TournamentGameLogsSerializer(serializers.ModelSerializer):
    player1_intra_id: str = serializers.CharField(source="player1.intra_id")
    player2_intra_id: str = serializers.CharField(source="player2.intra_id")

    class Meta:
        model: TournamentGameLogs = TournamentGameLogs
        fields = (
            "tournament_name",
            "round",
            "player1_intra_id",
            "player2_intra_id",
            "player1_score",
            "player2_score",
            "start_time",
            "end_time",
            "is_final",
        )

    def create(self, validated_data: dict) -> TournamentGameLogs:
        return create_game_log(validated_data, is_general=False)

    def validate(self, data: dict) -> dict:
        if data["player1"] == data["player2"]:
            raise serializers.ValidationError("Winner and loser must be different.")
        # 시작 시간이 끝나는 시간보다 이전인지 확인
        if data["start_time"] >= data["end_time"]:
            raise serializers.ValidationError("End time must be later than start time.")
        # 끝나는 시간이 현재 시각보다 이후인지 확인
        if data["end_time"] > timezone.now():
            raise serializers.ValidationError("End time must not be in the future.")
        # 라운드가 양수인지 확인
        if data["round"] <= 0:
            raise serializers.ValidationError("The round must be a positive number.")
        if data["player1_score"] < 0 or data["player2_score"] < 0:
            raise serializers.ValidationError("Score must be a non-negative number.")
        return data


class TournamentGameLogsListSerializer(serializers.ModelSerializer):
    player1: Users = UsersSerializer()
    player2: Users = UsersSerializer()

    class Meta:
        model: TournamentGameLogsSerializer = TournamentGameLogs
        fields = (
            "tournament_name",
            "round",
            "player1",
            "player2",
            "player1_score",
            "player2_score",
            "start_time",
            "end_time",
            "is_final",
        )

    def create(self, validated_data: dict) -> TournamentGameLogs:
        return create_game_log(validated_data, is_general=False)
