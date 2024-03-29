import uuid
from datetime import datetime

from django.db import models
from accounts.models import Users


class RequestStatusEnum(models.TextChoices):
    ACCEPTED = "1", "Accept"
    PENDING = "0", "Pending"


"""
Foreign Key options
- CASCADE: 부모가 삭제되면 자식도 삭제
- db_column: DB에 저장되는 컬럼명
- related_name: 역참조 시 사용할 이름
"""


class FriendRequests(models.Model):
    request_id: str or uuid = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    request_user_id: Users = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="request_user_id",
        related_name="from_user",
    )
    response_user_id: Users = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="response_user_id",
        related_name="to_user",
    )
    created_time: datetime = models.DateTimeField(
        auto_now_add=True
    )  # 생성 시간 자동 설정
    updated_time: datetime = models.DateTimeField(
        auto_now=True
    )  # 업데이트 시간 자동 설정
    status: str = models.CharField(
        max_length=2,
        choices=RequestStatusEnum.choices,
        default=RequestStatusEnum.PENDING,
    )

    class Meta:
        db_table = "FriendRequests"
        ordering = ["created_time"]
