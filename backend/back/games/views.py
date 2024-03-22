import uuid

from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, DatabaseError
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from accounts.models import Users
from .serializers import (
    GeneralGameLogsSerializer,
    GeneralGameLogsListSerializer,
    TournamentGameLogsSerializer,
    TournamentGameLogsListSerializer,
)
from .models import (
    GeneralGameLogs,
    TournamentGameLogs,
)


def is_exist_user(key, value):
    try:
        user = None
        if key == "intra_id":
            user = Users.objects.get(intra_id=value)
        elif key == "user_id":
            uuid.UUID(value)  # UUID 형식인지 확인, 안하면 get 내부 함수에서 raise 발생
            user = Users.objects.get(user_id=value)
        return user
    except (ObjectDoesNotExist, ValueError):
        return None


def get_user_from_intra_id_or_user_id(ids):
    """
    intra_id 또는 user_id로 유저를 찾아 반환
    """
    user = is_exist_user("intra_id", ids)
    if user is None:
        user = is_exist_user("user_id", ids)
        if user is None:
            raise ValidationError({"error": "유저가 존재하지 않습니다."})
    return user


def create_with_intra_id_convert_to_user_id(self, request):
    """
    intra_id를 user_id로 변환하여 Game Log를 생성
    """
    player1_intra_id = request.data.get("player1_intra_id")
    player2_intra_id = request.data.get("player2_intra_id")

    player1_user = get_user_from_intra_id_or_user_id(player1_intra_id)
    player2_user = get_user_from_intra_id_or_user_id(player2_intra_id)

    request_copy_data = request.data.copy()
    request_copy_data["player1"] = player1_user.user_id
    request_copy_data["player2"] = player2_user.user_id

    serializer = self.get_serializer(data=request_copy_data)
    serializer.is_valid(raise_exception=True)
    self.perform_create(serializer)
    headers = self.get_success_headers(serializer.data)
    return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class GeneralGameLogsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = GeneralGameLogs.objects.all()
    serializer_class = GeneralGameLogsSerializer
    http_method_names = ["post"]

    # general game logs 생성 시 join general game 생성하는 오버라이딩 에러 발생
    # fk는 uuid가 아닌 인스턴스를 요구해서 생긴 에러인듯
    def create(self, request, *args, **kwargs):
        try:
            return create_with_intra_id_convert_to_user_id(self, request)

        except IntegrityError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except DatabaseError as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GeneralGameLogsListViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = GeneralGameLogs.objects.all()
    serializer_class = GeneralGameLogsListSerializer

    def list(self, request, *args, **kwargs):
        if "intra_id" not in kwargs:
            return super().list(request, *args, **kwargs)

        user = get_user_from_intra_id_or_user_id(kwargs["intra_id"])
        if user is None:
            return Response(
                {"error": "유저가 존재하지 않습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )
        queryset = self.queryset.filter(
            Q(player1=user.user_id) | Q(player2=user.user_id)
        )
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)


class TournamentGameLogsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TournamentGameLogs.objects.all()
    serializer_class = TournamentGameLogsSerializer
    http_method_names = ["post"]

    def create(self, request, *args, **kwargs):
        try:
            return create_with_intra_id_convert_to_user_id(self, request)

        except IntegrityError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except DatabaseError as e:
            return Response(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TournamentGameLogsListViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TournamentGameLogs.objects.all()
    serializer_class = TournamentGameLogsListSerializer

    def list(self, request, *args, **kwargs):
        if "intra_id" not in kwargs and "name" not in kwargs:
            return super().list(request, *args, **kwargs)

        if "intra_id" in kwargs and "name" not in kwargs:
            user = get_user_from_intra_id_or_user_id(kwargs["intra_id"])
            if user is None:
                return Response(
                    {"error": "유저가 존재하지 않습니다."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            queryset = self.queryset.filter(
                Q(player1=user.user_id) | Q(player2=user.user_id)
            )
        elif "name" in kwargs and "intra_id" not in kwargs:
            queryset = self.queryset.filter(tournament_name=kwargs["name"])
        else:
            raise ValidationError({"detail": "잘못된 요청입니다."})
        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)