import os
import requests
from django.views.decorators.csrf import csrf_exempt
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import redirect
from django.core.files.base import ContentFile
from django.conf import settings
from django.db.models import Q
from .serializers import UsersSerializer, UsersDetailSerializer
from .models import Users, HouseEnum, UserStatusEnum
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import login
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import logout
from games.models import GeneralGameLogs, TournamentGameLogs
from games.serializers import (
    GeneralGameLogsListSerializer,
    TournamentGameLogsListSerializer,
)

HOUSE = {
    "Gam": HouseEnum.RAVENCLAW,
    "Gun": HouseEnum.HUFFLEPUFF,
    "Lee": HouseEnum.GRYFFINDOR,
    "Gon": HouseEnum.SLYTHERIN,
}

BASE_FULL_IP = f"https://{os.environ.get('BASE_IP')}/"


# https://squirmm.tistory.com/entry/Django-DRF-Method-Override-%EB%B0%A9%EB%B2%95
class UsersViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Users.objects.all()
    serializer_class: UsersSerializer = UsersSerializer
    http_method_names = ["get"]


class MeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Users.objects.all()
    serializer_class: UsersDetailSerializer = UsersDetailSerializer
    http_method_names = ["get"]

    @csrf_exempt
    def list(self, request, *args, **kwargs) -> Response:
        """
        GET method override
        """
        queryset = UsersViewSet.queryset.filter(intra_id=request.user.intra_id)
        serializer = UsersDetailSerializer(queryset, many=True)
        return Response(serializer.data)


class UsersDetailViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Users.objects.all()
    serializer_class: UsersDetailSerializer = UsersDetailSerializer
    http_method_names = [
        "get",
        "patch",
    ]
    lookup_field: str = "intra_id"

    # nickname과 profile_image, status를 제외한 모든 필드를 수정 불가로 설정
    can_not_change_fields: tuple[str] = (
        "user_id",
        "password",
        "last_login",
        "is_superuser",
        "intra_id",
        "win_count",
        "lose_count",
        "created_time",
        "updated_time",
        "is_staff",
        "is_active",
        "groups",
        "user_permissions",
    )

    def list(self, request, *args, **kwargs) -> Response:
        """
        GET method override
        """
        queryset = UsersViewSet.queryset.filter(intra_id=kwargs["intra_id"])
        if not queryset.exists():
            raise ValidationError({"detail": "존재하지 않는 사용자입니다."})
        serializer = UsersDetailSerializer(queryset, many=True)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs) -> Response:
        """
        PATCH method override
        """
        try:
            user = Users.objects.get(intra_id=kwargs["intra_id"])
        except Users.DoesNotExist:
            return Response(
                {"error": "없는 유저입니다."}, status=status.HTTP_404_NOT_FOUND
            )

        if request.user.intra_id != user.intra_id:
            raise PermissionDenied(
                {"detail": "다른 사용자의 정보는 수정할 수 없습니다."}
            )
        for field in self.can_not_change_fields:
            if request.data.get(field) is not None:
                raise PermissionDenied(
                    {"detail": f"{field}는 수정할 수 없는 필드입니다."}
                )
        instance = user
        previous_image = instance.profile_image
        response = super().partial_update(request, *args, **kwargs)

        if previous_image and request.data.get("profile_image") is not None:
            try:
                os.remove(os.path.join(settings.MEDIA_ROOT, previous_image.name))
            except FileNotFoundError:
                pass
        return response


class Login42APIView(APIView):
    def get(self, request, *args, **kwargs) -> redirect:
        if request.user.is_authenticated:
            return redirect(BASE_FULL_IP)

        client_id = os.environ.get("CLIENT_ID")
        response_type = "code"
        redirect_uri = os.environ.get("REDIRECT_URI")
        state = os.environ.get("STATE")
        oauth_42_api_url = "https://api.intra.42.fr/oauth/authorize"
        return redirect(
            f"{oauth_42_api_url}?client_id={client_id}&redirect_uri={redirect_uri}&response_type={response_type}&state={state}"
        )


# https://soyoung-new-challenge.tistory.com/92
class CallbackAPIView(APIView):
    def _generate_unique_nickname(self, nickname) -> str:
        original_nickname = nickname
        count = 0
        while Users.objects.filter(nickname=nickname).exists():
            count += 1
            nickname = f"{original_nickname}_{count}"
        return nickname

    def get(self, request, *args, **kwargs) -> redirect:
        if request.user.is_authenticated:
            return redirect(BASE_FULL_IP)

        if request.session.get("state") and not request.GET.get(
            "state"
        ) == os.environ.get("STATE"):
            raise ValidationError({"detail": "oauth중 state 검증 실패."})

        access_token = self._get_access_token(request)
        # 42 api에 정보 요청
        user_info_request = requests.get(
            "https://api.intra.42.fr/v2/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        # 42 api에 정보 요청 실패
        if user_info_request.status_code != 200:
            return redirect(BASE_FULL_IP)

        user_info = user_info_request.json()
        coalition_info_request = requests.get(
            f"https://api.intra.42.fr/v2/users/{user_info['id']}/coalitions",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        coalition_info = coalition_info_request.json()
        try:
            login_id = user_info["login"]
            image_address = user_info["image"]["versions"]["large"]
            house = HOUSE[coalition_info[0]["name"]]
        except:
            return redirect(BASE_FULL_IP)
        nickname = self._generate_unique_nickname(login_id)
        user_instance, created = Users.objects.get_or_create(
            intra_id=login_id, defaults={"nickname": nickname, "house": house}
        )

        if created:
            response = requests.get(image_address)
            if response.status_code == 200:
                image_content = ContentFile(response.content)
                user_instance.profile_image.save(f"{login_id}.png", image_content)
            user_instance.save()
        # login
        login(request, user_instance)
        user_instance.status = UserStatusEnum.ONLINE
        user_instance.save()
        return redirect(BASE_FULL_IP)

    def _get_access_token(self, request) -> str:
        grant_type = "authorization_code"
        client_id = os.environ.get("CLIENT_ID")
        client_secret = os.environ.get("CLIENT_SECRET")
        code = request.GET.get("code")
        state = request.GET.get("state")
        redirect_uri = os.environ.get("REDIRECT_URI")
        data = {
            "grant_type": grant_type,
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "state": state,
            "redirect_uri": redirect_uri,
        }
        token_request = requests.post("https://api.intra.42.fr/oauth/token", data)
        token_response_json = token_request.json()
        return token_response_json.get("access_token")


def logout_view(request) -> redirect:
    if request.user.is_authenticated:
        user_instance = request.user
        user_instance.status = UserStatusEnum.OFFLINE
        user_instance.save()

    logout(request)
    return redirect(BASE_FULL_IP)


class ChartViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Users.objects.all()
    serializer_class: UsersSerializer = UsersSerializer
    http_method_names = ["get"]

    @staticmethod
    def _add_data(
        request: requests, data: dict, win_logs: dict, lose_logs: dict
    ) -> None:
        for logs in data:
            if logs["player1"]["intra_id"] == request.user.intra_id:
                if logs["player1_score"] > logs["player2_score"]:
                    win_logs[logs["player2"]["house"]] += 1
                else:
                    lose_logs[logs["player2"]["house"]] += 1
            else:
                if logs["player2_score"] > logs["player1_score"]:
                    win_logs[logs["player1"]["house"]] += 1
                else:
                    lose_logs[logs["player1"]["house"]] += 1

    @csrf_exempt
    def list(self, request, *args, **kwargs) -> Response:
        """
        GET method override
        """
        data = {}

        # 사용자의 각 기숙사 별 대결 승률
        win_logs = {"RA": 0, "GR": 0, "HU": 0, "SL": 0}
        lose_logs = {"RA": 0, "GR": 0, "HU": 0, "SL": 0}
        general_game = GeneralGameLogs.objects.all()
        general_game_queryset = general_game.filter(
            Q(player1=request.user.user_id) | Q(player2=request.user.user_id)
        )
        general_game_serializer = GeneralGameLogsListSerializer(
            general_game_queryset, many=True
        )
        self._add_data(request, general_game_serializer.data, win_logs, lose_logs)

        tournament = TournamentGameLogs.objects.all()
        tournament_queryset = tournament.filter(
            Q(player1=request.user.user_id) | Q(player2=request.user.user_id)
        )
        tournament_serializer = TournamentGameLogsListSerializer(
            tournament_queryset, many=True
        )
        self._add_data(request, tournament_serializer.data, win_logs, lose_logs)

        data["win_count"] = sum(win_logs.values())
        data["lose_count"] = sum(lose_logs.values())
        data["total_count"] = data["win_count"] + data["lose_count"]
        data["rate"] = {
            "total": data["win_count"] / (data["total_count"] + 1e-18),
            "RA": win_logs["RA"] / (win_logs["RA"] + lose_logs["RA"] + 1e-18),
            "GR": win_logs["GR"] / (win_logs["GR"] + lose_logs["GR"] + 1e-18),
            "HU": win_logs["HU"] / (win_logs["HU"] + lose_logs["HU"] + 1e-18),
            "SL": win_logs["SL"] / (win_logs["SL"] + lose_logs["SL"] + 1e-18),
        }

        # 각 기숙사 별 승률
        data["house"] = {}
        for house in ("RA", "GR", "HU", "SL"):
            queryset = UsersViewSet.queryset.filter(house=house)
            serializer = UsersSerializer(queryset, many=True)
            total_win_count, total_lose_count = 0, 0
            for user in serializer.data:
                total_win_count += user["win_count"]
                total_lose_count += user["lose_count"]
            rate = (
                total_win_count / (total_win_count + total_lose_count)
                if total_win_count + total_lose_count
                else 0
            )
            data["house"][house] = rate

        return Response(data)


# test 유저용 login
class TestAccountLogin(APIView):

    def get(self, request, *args, **kwargs) -> redirect or Response:
        """
        GET method override
        """
        if request.user.is_authenticated:
            return redirect(BASE_FULL_IP)
        try:
            user_instance = Users.objects.get(intra_id=kwargs["intra_id"])
            if user_instance.is_test_user:
                user_instance.status = UserStatusEnum.ONLINE
                user_instance.save()
                login(request, user_instance)
            else:
                print("Error: 허용 되지 않은 유저입니다.")
            return redirect(BASE_FULL_IP)
        except Users.DoesNotExist:
            print("Error: 사용자를 찾을 수 없습니다.")
            return redirect(BASE_FULL_IP)
