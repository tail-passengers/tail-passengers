from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import FriendRequests
from accounts.models import Users


class FriendListViewSetTestCase(APITestCase):
    """
    FriendListViewSet 테스트
    - method: GET
    """

    def setUp(self):
        # 사용자 생성
        self.user1 = Users.objects.create_user(intra_id="user1")
        self.user2 = Users.objects.create_user(intra_id="user2")
        self.user3 = Users.objects.create_user(intra_id="user3")

        # 친구 요청 생성
        FriendRequests.objects.create(
            request_user_id=self.user1,
            response_user_id=self.user2,
            status="0",
        )
        FriendRequests.objects.create(
            request_user_id=self.user1,
            response_user_id=self.user3,
            status="1",
        )

    def test_get_list_all_without_authenticate(self):
        """
        인증 없이 친구 요청 리스트 확인 시, 403 에러 확인
        """
        url = reverse(
            "friend_list", kwargs={"intra_id": self.user1.intra_id, "status": "all"}
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_list_all(self):
        """
        전체 친구 요청 리스트 확인
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse(
            "friend_list", kwargs={"intra_id": self.user1.intra_id, "status": "all"}
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_get_list_pending(self):
        """
        pending 친구 요청 리스트 확인
        """
        self.client.force_authenticate(user=self.user2)
        url = reverse(
            "friend_list", kwargs={"intra_id": self.user2.intra_id, "status": "pending"}
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_list_accepted(self):
        """
        accepted 친구 요청 리스트 확인
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse(
            "friend_list",
            kwargs={"intra_id": self.user1.intra_id, "status": "accepted"},
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_list_invalid_status(self):
        """
        잘못된 status로 요청 시, 400 에러 확인
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse(
            "friend_list", kwargs={"intra_id": self.user1.intra_id, "status": "invalid"}
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_list_another_user(self):
        """
        다른 유저의 친구 요청 리스트 확인 시, 403 에러 확인
        """
        self.client.force_authenticate(user=self.user2)
        url = reverse(
            "friend_list", kwargs={"intra_id": self.user1.intra_id, "status": "all"}
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class FriendRequestViewSetTestCase(APITestCase):
    """
    FriendRequestViewSet 테스트
    - method: POST
    """

    def setUp(self):
        # url
        self.url = reverse("friend_requests")

        # 사용자 생성
        self.user1 = Users.objects.create_user(intra_id="user1")
        self.user2 = Users.objects.create_user(intra_id="user2")
        self.user3 = Users.objects.create_user(intra_id="user3")
        self.user4 = Users.objects.create_user(intra_id="user4")

        # 친구 요청 생성
        FriendRequests.objects.create(
            request_user_id=self.user2,
            response_user_id=self.user3,
            status="0",
        )
        FriendRequests.objects.create(
            request_user_id=self.user3,
            response_user_id=self.user4,
            status="1",
        )

    def test_create_friend_request_without_authenticate(self):
        """
        인증 없이 친구 요청 생성 시, 403 에러 확인
        """
        data = {
            "request_user_id": self.user1.intra_id,
            "response_user_id": self.user2.intra_id,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_friend_request(self):
        """
        친구 요청 생성
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "request_user_id": self.user1.intra_id,
            "response_user_id": self.user2.intra_id,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_friend_request_to_me(self):
        """
        나에게 친구 요청 했을 때 400 에러 확인
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "request_user_id": self.user1.intra_id,
            "response_user_id": self.user1.intra_id,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_friend_request_already_requested(self):
        """
        이미 친구 요청을 보낸 친구에게 다시 요청을 보낸 경우 400 에러 확인
        """
        self.client.force_authenticate(user=self.user2)
        data = {
            "request_user_id": self.user2.intra_id,
            "response_user_id": self.user3.intra_id,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_friend_request_already_response(self):
        """
        이미 친구 요청을 받은 친구에게 요청을 보낸 경우 400 에러 확인
        """
        self.client.force_authenticate(user=self.user2)
        data = {
            "request_user_id": self.user3.intra_id,
            "response_user_id": self.user2.intra_id,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_friend_request_already_accepted(self):
        """
        이미 친구 요청을 수락한 경우 400 에러 확인
        """
        self.client.force_authenticate(user=self.user3)
        data = {
            "request_user_id": self.user3.intra_id,
            "response_user_id": self.user4.intra_id,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_friend_request_not_me(self):
        """
        내가 아닌 유저로 친구 요청을 보낸 경우 400 에러 확인
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "request_user_id": self.user2.intra_id,
            "response_user_id": self.user3.intra_id,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        data = {
            "request_user_id": self.user3.intra_id,
            "response_user_id": self.user1.intra_id,
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FriendRequestDetailViewSetTestCase(APITestCase):
    """
    FriendRequestDetailViewSet 테스트
    - method: PATCH, DELETE
    """

    def setUp(self):
        # 사용자 생성
        self.user1 = Users.objects.create_user(intra_id="user1")
        self.user2 = Users.objects.create_user(intra_id="user2")
        self.user3 = Users.objects.create_user(intra_id="user3")
        self.user4 = Users.objects.create_user(intra_id="user4")

        # 친구 요청 생성
        self.friend_request1 = FriendRequests.objects.create(
            request_user_id=self.user1,
            response_user_id=self.user2,
            status="0",
        )
        self.friend_request2 = FriendRequests.objects.create(
            request_user_id=self.user3,
            response_user_id=self.user4,
            status="1",
        )

    def test_patch_friend_request_without_authenticate(self):
        """
        인증 없이 친구 요청 수락/거절 시, 403 에러 확인
        """
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request1.request_id},
        )
        data = {"status": "1"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_friend_request(self):
        """
        친구 요청 수락
        """
        self.client.force_authenticate(user=self.user2)
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request1.request_id},
        )
        data = {"status": "1"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_friend_request_invalid_status(self):
        """
        잘못된 status로 요청 시, 400 에러 확인
        """
        self.client.force_authenticate(user=self.user2)
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request1.request_id},
        )
        data = {"status": "invalid"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_friend_request_already_friend(self):
        """
        이미 친구인 경우, 400 에러 확인
        """
        self.client.force_authenticate(user=self.user3)
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request2.request_id},
        )
        data = {"status": "0"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_friend_request_request_user(self):
        """
        보낸 유저가 다른 유저의 친구 요청을 수락/거절 시, 403 에러 확인
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request1.request_id},
        )
        data = {"status": "1"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_friend_request_another_user(self):
        """
        다른 유저가 친구 요청을 수락/거절 시, 403 에러 확인
        """
        self.client.force_authenticate(user=self.user3)
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request1.request_id},
        )
        data = {"status": "1"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_friend_request_reject(self):
        """
        친구 요청 거절
        """
        self.client.force_authenticate(user=self.user2)
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request1.request_id},
        )
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_friend_request_delete(self):
        """
        친구 삭제
        """
        self.client.force_authenticate(user=self.user3)
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request2.request_id},
        )
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_friend_request_another_user(self):
        """
        다른 유저가 친구 삭제 시, 400 에러 확인
        """
        self.client.force_authenticate(user=self.user1)
        url = reverse(
            "friend_requests_detail",
            kwargs={"request_id": self.friend_request2.request_id},
        )
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
