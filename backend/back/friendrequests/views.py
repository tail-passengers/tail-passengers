from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import FriendRequests
from .serializers import (
    FriendListSerializer,
    FriendRequestSerializer,
    FriendRequestDetailSerializer,
)
from accounts.views import UsersViewSet


class FriendListViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = FriendRequests.objects.all()
    serializer_class: FriendListSerializer = FriendListSerializer
    http_method_names = ["get"]
    lookup_field = "intra_id"

    def list(self, request, *args, **kwargs) -> Response:
        intra_id = kwargs["intra_id"]
        if "status" not in kwargs:
            raise ValidationError({"detail": "잘못된 url입니다."})
        queryset = UsersViewSet.queryset.filter(intra_id=intra_id)
        if not queryset.exists():
            raise ValidationError({"detail": "존재하지 않는 사용자입니다."})
        user_id = queryset.first().user_id
        if user_id != request.user.user_id:
            return Response(
                {"error": "자신의 친구 목록만 볼 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        url_status = kwargs["status"]
        if url_status == "pending":
            queryset = self.queryset.filter(Q(response_user_id=user_id) & Q(status="0"))
        elif url_status == "accepted":
            queryset = self.queryset.filter(
                Q(Q(request_user_id=user_id) | Q(response_user_id=user_id))
                & Q(status="1")
            )
        elif url_status == "all":
            queryset = self.queryset.filter(
                Q(request_user_id=user_id) | Q(response_user_id=user_id)
            )
        else:
            raise ValidationError({"detail": "잘못된 url입니다."})
        serializer = self.serializer_class(queryset, many=True)
        for d in serializer.data:
            req_id, res_id = d.pop("request_user_id"), d.pop("response_user_id")
            d["friend_requests"] = res_id if req_id["intra_id"] == intra_id else req_id
        return Response(serializer.data)


class FriendRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = FriendRequests.objects.all()
    serializer_class: FriendRequestSerializer = FriendRequestSerializer
    http_method_names = ["post"]

    def create(self, request, *args, **kwargs) -> Response:
        request_user_intra_id = request.data.get("request_user_id")
        response_user_intra_id = request.data.get("response_user_id")

        request_user = UsersViewSet.queryset.filter(intra_id=request_user_intra_id)
        response_user = UsersViewSet.queryset.filter(intra_id=response_user_intra_id)

        if not request_user.exists() or not response_user.exists():
            raise ValidationError({"detail": "존재하지 않는 사용자입니다."})

        request_user_id = request_user.first().user_id
        response_user_id = response_user.first().user_id

        if request.user.user_id != request_user_id:
            raise ValidationError(
                {"detail": "자신이 아닌 다른 사람의 친구 요청을 보낼 수 없습니다."}
            )
        if request_user_id == response_user_id:
            raise ValidationError(
                {"detail": "친구 요청을 받는 사람은 자신이 될 수 없습니다."}
            )
        queryset = self.queryset.filter(
            Q(Q(request_user_id=request_user_id) & Q(response_user_id=response_user_id))
            | Q(
                Q(request_user_id=response_user_id)
                & Q(response_user_id=request_user_id)
            )
        )
        if queryset.exists():
            raise ValidationError({"detail": "이미 친구 요청을 보냈습니다."})
        request_copy_data = request.GET.copy()
        request_copy_data["request_user_id"] = request_user_id
        request_copy_data["response_user_id"] = response_user_id

        serializer = self.get_serializer(data=request_copy_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class FriendRequestDetailViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = FriendRequests.objects.all()
    serializer_class: FriendRequestDetailSerializer = FriendRequestDetailSerializer
    http_method_names = ["patch", "delete"]
    lookup_field = "request_id"

    def partial_update(self, request, *args, **kwargs) -> Response:
        owner = request.user
        instance = self.get_object()
        if owner != instance.response_user_id:
            raise ValidationError(
                {"detail": "자신이 아닌 다른 사람의 친구 요청을 수락할 수 없습니다."}
            )
        if instance.status == "1":
            raise ValidationError(
                {"detail": "이미 수락한 친구 요청을 다시 수락할 수 없습니다."}
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs) -> Response:
        owner = request.user
        instance = self.get_object()
        if owner != instance.request_user_id and owner != instance.response_user_id:
            raise ValidationError(
                {"detail": "자신이 아닌 다른 사람의 친구 요청을 삭제할 수 없습니다."}
            )
        return super().destroy(request, *args, **kwargs)
