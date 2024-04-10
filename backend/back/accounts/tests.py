from django.contrib.auth import get_user_model
from django.utils.timezone import make_aware
from datetime import datetime
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import UserStatusEnum


class UsersViewSetTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(intra_id="1")

    def test_get_user_without_authenticate(self):
        """
        인증이 없을때 403 에러 확인
        """
        url = reverse("users")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_with_authenticate(self):
        """
        인증이 있을때 200 상태 코드 확인
        """
        self.client.force_authenticate(user=self.user)
        url = reverse("users")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_add_user(self):
        """
        디버그용 post 잘 작동하는지 확인
        """
        self.client.force_authenticate(user=self.user)
        url = reverse("users")
        data = {
            "intra_id": "2",
        }
        # 생성 확인
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # 중복 id 체크
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MeViewSetTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(intra_id="2")

    def test_get_user_without_authenticate(self):
        """
        인증이 없을때 403 에러 확인
        """
        url = reverse("me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_with_authenticate(self):
        """
        인증이 있을때 200 상태 코드 확인
        """
        self.client.force_authenticate(user=self.user)
        url = reverse("me")
        response = self.client.get(url)
        self.assertEqual(self.user.intra_id, response.data[0]["intra_id"])
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class UsersDetailViewSetTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(intra_id="3")
        self.other_user = get_user_model().objects.create_user(intra_id="4")

    def test_get_not_exists_user(self):
        """
        없는 유저일때 get test
        """
        self.client.force_authenticate(user=self.user)
        url = reverse("users_detail", kwargs={"intra_id": 5})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_without_authenticate(self):
        """
        권한 없이 patch test
        """
        url = reverse("users_detail", kwargs={"intra_id": self.user.intra_id})
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch(self):
        """
        기본적인 patch test
        """
        self.client.force_authenticate(user=self.user)
        url = reverse("users_detail", kwargs={"intra_id": self.user.intra_id})
        self.assertEqual(self.user.nickname, "3")
        data = {"nickname": "changed"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # PATCH 요청 후에는 데이터베이스의 사용자 객체가 업데이트되지 않으므로,
        # 1. 새로고침 (self.user.refresh_from_db())
        # 2. 응답 데이터에서 확인
        # 일단 2번째 방법을 사용
        self.assertEqual(response.data["nickname"], "changed")

    def test_patch_can_not_change_field(self):
        """
        수정하면 안 되는 필드 테스트
        """
        self.client.force_authenticate(user=self.user)
        url = reverse("users_detail", kwargs={"intra_id": self.user.intra_id})
        data = {"user_id": "1"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_unique_nickname(self):
        """
        동일한 닉네임으로 변경하는 경우 테스트
        """
        self.client.force_authenticate(user=self.user)
        url = reverse("users_detail", kwargs={"intra_id": self.user.intra_id})
        data = {"nickname": self.other_user.nickname}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ChartViewSetTest(APITestCase):
    def setUp(self):
        self.user1 = get_user_model().objects.create_user(
            intra_id="1", house="RA", win_count=7, lose_count=3
        )
        self.user2 = get_user_model().objects.create_user(
            intra_id="2", house="GR", win_count=6, lose_count=4
        )
        self.user3 = get_user_model().objects.create_user(
            intra_id="3", house="HU", win_count=5, lose_count=5
        )
        self.user4 = get_user_model().objects.create_user(
            intra_id="4", house="SL", win_count=4, lose_count=6
        )
        self.create_url = reverse("general_game_logs")
        self.start_time = make_aware(datetime(2021, 1, 1, 0, 0, 0))
        self.end_time = make_aware(datetime(2021, 1, 2, 1, 0, 0))

    def test_get_house_with_authenticate(self):
        """
        기숙사 정보를 가져오는 테스트
        """
        self.client.force_authenticate(user=self.user1)

        data = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user2.intra_id,
            "player1_score": 5,
            "player2_score": 3,
        }
        self.client.post(self.create_url, data)
        data = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user3.intra_id,
            "player1_score": 5,
            "player2_score": 3,
        }
        self.client.post(self.create_url, data)
        data = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "player1_intra_id": self.user4.intra_id,
            "player2_intra_id": self.user1.intra_id,
            "player1_score": 5,
            "player2_score": 3,
        }
        self.client.post(self.create_url, data)
        data = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user4.intra_id,
            "player1_score": 5,
            "player2_score": 3,
        }
        self.client.post(self.create_url, data)

        url = reverse("chart")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(response.data["win_count"], 3)
        self.assertEqual(response.data["lose_count"], 1)
        self.assertEqual(response.data["total_count"], 4)

        rate = (0.75, 0.0, 1.0, 1.0, 0.5)
        house = ("total", "RA", "GR", "HU", "SL")
        for idx, (key, value) in enumerate(response.data["rate"].items()):
            self.assertEqual(key, house[idx])
            self.assertEqual(value, rate[idx])

        rate = (0.7, 0.6, 0.5, 0.4)
        house = ("RA", "GR", "HU", "SL")
        for idx, (key, value) in enumerate(response.data["house"].items()):
            self.assertEqual(key, house[idx])
            self.assertEqual(value, rate[idx])


class LoginLogoutUserStatusTest(APITestCase):
    def setUp(self):
        """
        test 유저 생성
        """
        self.user = get_user_model().objects.create_user(
            intra_id="1", is_test_user=True
        )
        self.login_url = reverse(
            "test_user_login", kwargs={"intra_id": self.user.intra_id}
        )
        self.logout_url = reverse("logout")

    def test_login_logout_user_status(self):
        """
        login시 status가 online인지 확인
        logout시 status가 offline인지 확인
        """
        # active 초기값 False 확인
        self.assertEqual(self.user.status, UserStatusEnum.OFFLINE)

        # login
        response = self.client.get(self.login_url)
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.ONLINE)

        # logout
        response = self.client.get(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.OFFLINE)

    def test_double_login(self):
        """
        login double로 해도 올바른 상태값 반환하는지
        """
        # active 초기값 False 확인
        self.assertEqual(self.user.status, UserStatusEnum.OFFLINE)

        # login
        response = self.client.get(self.login_url)

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.ONLINE)

        # double login
        response = self.client.get(self.login_url)

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.ONLINE)

    def test_double_logout(self):
        """
        logout double로 해도 올바른 상태값 반환하는지
        """
        # active 초기값 False 확인
        self.assertEqual(self.user.status, UserStatusEnum.OFFLINE)

        # login
        response = self.client.get(self.login_url)

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.ONLINE)

        # logout
        url = reverse("logout")
        response = self.client.get(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.OFFLINE)

        # double logout
        response = self.client.get(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.OFFLINE)

    def test_login_logout_login(self):
        """
        login_logout_login 할때
        """
        # active 초기값 False 확인
        self.assertEqual(self.user.status, UserStatusEnum.OFFLINE)

        # login
        response = self.client.get(self.login_url)

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.ONLINE)

        # logout
        response = self.client.get(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.OFFLINE)

        # login
        response = self.client.get(self.login_url)

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.user.refresh_from_db()
        self.assertEqual(self.user.status, UserStatusEnum.ONLINE)