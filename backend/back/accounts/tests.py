from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import Users


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

    def test_delete_without_authenticate(self):
        """
        권한 없이 delete test
        """
        url = reverse("users_detail", kwargs={"intra_id": self.user.intra_id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete(self):
        """
        기본적인 delete test
        """
        self.client.force_authenticate(user=self.user)
        initial_user_count = get_user_model().objects.count()
        url = reverse("users_detail", kwargs={"intra_id": self.user.intra_id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # 삭제 후 유저 수가 1 감소했는지 확인
        self.assertEqual(get_user_model().objects.count(), initial_user_count - 1)
        # 삭제된 유저의 pk로 유저가 존재하지 않는지 확인
        self.assertFalse(get_user_model().objects.filter(pk=self.user.pk).exists())

    def test_delete_other_pk(self):
        """
        다른 유저 삭제 가능한지 test
        """
        self.client.force_authenticate(user=self.user)
        initial_user_count = get_user_model().objects.count()
        url = reverse("users_detail", kwargs={"intra_id": self.other_user.intra_id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # 삭제 오류 후 유저 수가 동일한지 확인
        self.assertEqual(get_user_model().objects.count(), initial_user_count)
        # 삭제된 유저의 pk로 유저가 존재하지 않는지 확인
        self.assertTrue(get_user_model().objects.filter(pk=self.user.pk).exists())

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
