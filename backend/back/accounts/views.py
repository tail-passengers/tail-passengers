import os
import requests
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import redirect
from django.core.files.base import ContentFile
from django.conf import settings
from .serializers import UsersSerializer, UsersDetailSerializer
from .models import Users, HouseEnum
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import login
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import logout


HOUSE = {
    "Gam": HouseEnum.RAVENCLAW,
    "Gun": HouseEnum.HUFFLEPUFF,
    "Lee": HouseEnum.GRYFFINDOR,
    "Gon": HouseEnum.SLYTHERIN,
}


# https://squirmm.tistory.com/entry/Django-DRF-Method-Override-%EB%B0%A9%EB%B2%95
class UsersViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Users.objects.all()
    serializer_class: UsersSerializer = UsersSerializer
    http_method_names = ["get", "post"]  # TODO debug를 위해 post 임시 추가

    def create(self, request, *args, **kwargs) -> Response:
        """
        디버그용 post
        """
        intra_id: str | None = request.data.get("intra_id")
        if not intra_id:
            return Response(
                {"error": "intra_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # intra_id 중복 검사
        if Users.objects.filter(intra_id=intra_id).exists():
            return Response(
                {"error": "User with this intra_id already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 새로운 사용자 생성
        user = Users.objects.create_user(intra_id=intra_id)
        serializer = self.get_serializer(user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Users.objects.all()
    serializer_class: UsersDetailSerializer = UsersDetailSerializer
    http_method_names = ["get"]

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
            return redirect(
                f"http://{os.environ.get("BASE_IP")}/api/v1/users/{request.user.intra_id}/"
            )

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
    def get(self, request, *args, **kwargs) -> redirect:
        if request.user.is_authenticated:
            return redirect(
                f"http://{os.environ.get("BASE_IP")}/api/v1/users/{request.user.intra_id}/"
            )

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
        user_info = user_info_request.json()
        coalition_info_request = requests.get(
            f"https://api.intra.42.fr/v2/users/{user_info['id']}/coalitions",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        coalition_info = coalition_info_request.json()
        login_id = user_info["login"]
        image_address = user_info["image"]["versions"]["large"]
        house = HOUSE[coalition_info[0]["name"]]
        user_instance, created = Users.objects.get_or_create(
            intra_id=login_id,
            nickname=login_id,
            status=0,
            house=house,
        )

        if created:
            response = requests.get(image_address)
            if response.status_code == 200:
                image_content = ContentFile(response.content)
                user_instance.profile_image.save(f"{login_id}.png", image_content)
            user_instance.save()
        # login
        login(request, user_instance)
        return redirect(f"http://{os.environ.get("BASE_IP")}/api/v1/users/{user_instance.intra_id}/")

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
    logout(request)
    return redirect("/")


# TODO test 용도 삭제 해야함
class TestAccountLogin(APIView):

    def get(self, request, *args, **kwargs) -> redirect or Response:
        """
        GET method override
        """
        if request.user.is_authenticated:
            return redirect(
                f"http://{os.environ.get("BASE_IP")}/api/v1/users/{request.user.intra_id}/"
            )
        try:
            user_instance = Users.objects.get(intra_id=kwargs["intra_id"])
            if user_instance.is_test_user:
                login(request, user_instance)
                return Response({"message": "로그인 성공."}, status=200)
            else:
                return Response({"error": "허용되지 않는 유저입니다."}, status=403)
        except Users.DoesNotExist:
            return Response({"error": "사용자를 찾을 수 없습니다."}, status=404)
