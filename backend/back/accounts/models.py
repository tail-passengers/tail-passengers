import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, intra_id, **extra_fields):
        if not intra_id:
            raise ValueError("The Intra ID must be set")
        user = self.model(intra_id=intra_id, nickname=intra_id, **extra_fields)
        user.save(using=self._db)
        user.set_unusable_password()
        return user

    def create_superuser(self, intra_id, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(intra_id, **extra_fields)


class UserStatusEnum(models.TextChoices):
    ONLINE = "1", "Online"
    OFFLINE = "0", "Offline"


class Users(AbstractBaseUser, PermissionsMixin):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intra_id = models.CharField(max_length=20, unique=True, editable=False)
    nickname = models.CharField(max_length=20, unique=True)
    profile_image = models.ImageField(null=True, blank=True, upload_to="profile_images")
    win_count = models.IntegerField(default=0)
    lose_count = models.IntegerField(default=0)
    created_time = models.DateTimeField(auto_now_add=True, editable=False)
    updated_time = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=2, choices=UserStatusEnum.choices)

    is_staff = models.BooleanField(
        default=False
    )  # 추가: 관리자 사이트에 로그인하기 위해 필요
    is_active = models.BooleanField(default=True)  # 추가: 사용자가 활성 상태인지

    objects = UserManager()

    USERNAME_FIELD = "intra_id"
    REQUIRED_FIELDS = ["nickname"]

    class Meta:
        db_table = "Users"
        ordering = ["created_time"]

    def __str__(self):
        return self.intra_id
