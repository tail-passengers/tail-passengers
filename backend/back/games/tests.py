from django.utils.timezone import make_aware
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import (
    GeneralGameLogs,
    TournamentGameLogs,
)
from datetime import datetime, timedelta
from accounts.models import Users


class GeneralGameLogsViewSetTest(APITestCase):
    def setUp(self):
        # 두 명의 사용자 생성
        self.user1 = Users.objects.create_user(intra_id="user1")
        self.user2 = Users.objects.create_user(intra_id="user2")
        # 게임 로그 URL
        self.create_url = reverse("general_game_logs")
        self.list_url = reverse("general_game_all_logs")
        self.start_time = make_aware(datetime(2021, 1, 1, 0, 0, 0))
        self.end_time = make_aware(datetime(2021, 1, 2, 1, 0, 0))

    def test_create_general_game_log_without_authenticate(self):
        """
        인증이 없을때 403 에러 확인
        """
        data = {
            "start_time": "2021-01-01T00:00:00Z",
            "end_time": "2021-01-01T01:00:00Z",
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user2.intra_id,
            "player1_score": 5,
            "player2_score": 3,
        }
        response = self.client.post(self.create_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_general_game_log_with_authenticate(self):
        """
        인증이 있을때 201 상태 코드 확인
        """
        self.client.force_authenticate(user=self.user1)
        player1 = self.user1.intra_id
        player2 = self.user2.intra_id
        data = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "player1_intra_id": player1,
            "player2_intra_id": player2,
            "player1_score": 5,
            "player2_score": 3,
        }
        response = self.client.post(self.create_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # GeneralGameLogs 모델에서 데이터가 잘 들어갔는지 확인
        game_log = GeneralGameLogs.objects.get(game_id=response.data["game_id"])
        self.assertEqual(game_log.start_time, self.start_time)
        self.assertEqual(game_log.end_time, self.end_time)
        self.assertEqual(game_log.player1.intra_id, player1)
        self.assertEqual(game_log.player2.intra_id, player2)

    def test_create_general_game_log_same_player1_player2(self):
        """
        player1랑 player2가 동일할때 테스트
        """
        self.client.force_authenticate(user=self.user1)
        player1 = self.user1.intra_id
        player2 = self.user1.intra_id
        data = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "player1_intra_id": player1,
            "player2_intra_id": player2,
            "player1_score": 5,
            "player2_score": 3,
        }
        response = self.client.post(self.create_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_general_game_log_start_time_is_before_the_end_time(self):
        """
        시작 시간이 끝나는 시간보다 이전인지 확인하는 테스트
        """
        self.client.force_authenticate(user=self.user1)
        player1 = self.user1.intra_id
        player2 = self.user2.intra_id
        data = {
            "start_time": self.end_time,
            "end_time": self.start_time,
            "player1_intra_id": player1,
            "player2_intra_id": player2,
            "player1_score": 5,
            "player2_score": 3,
        }
        response = self.client.post(self.create_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_general_game_log_end_time_is_before_future(self):
        """
        끝나는 시간이 미래보다 전인지 확인하는 테스트
        """
        self.client.force_authenticate(user=self.user1)
        player1 = self.user1.intra_id
        player2 = self.user2.intra_id

        data = {
            "start_time": self.end_time,
            "end_time": datetime.now() + timedelta(hours=2),
            "player1_intra_id": player1,
            "player2_intra_id": player2,
            "player1_score": 5,
            "player2_score": 3,
        }
        response = self.client.post(self.create_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_general_game_log_uuid_fk(self):
        """
        get으로 create한 general_game_log/<str:intra_id>/ 잘 가져오는지 확인하는 테스트
        """
        self.client.force_authenticate(user=self.user1)
        player1 = self.user1.intra_id
        player2 = self.user2.intra_id
        data = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "player1_intra_id": player1,
            "player2_intra_id": player2,
            "player1_score": 5,
            "player2_score": 3,
        }
        response = self.client.post(self.create_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # get 으로 요청
        response = self.client.get(
            reverse("general_game_user_logs", kwargs={"intra_id": self.user1.intra_id})
        )

        # get 데이터 확인
        self.assertEqual(response.data[0]["start_time"], self.start_time.isoformat())
        self.assertEqual(response.data[0]["end_time"], self.end_time.isoformat())
        self.assertEqual(response.data[0]["player1"]["intra_id"], player1)
        self.assertEqual(response.data[0]["player2"]["intra_id"], player2)

    def test_score_minus(self):
        """
        점수가 음수일 때 테스트
        """
        self.client.force_authenticate(user=self.user1)
        player1 = self.user1.intra_id
        player2 = self.user2.intra_id
        data = {
            "start_time": self.start_time,
            "end_time": self.end_time,
            "player1_intra_id": player1,
            "player2_intra_id": player2,
            "player1_score": -1,
            "player2_score": 3,
        }
        response = self.client.post(self.create_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TournamentGameLogsViewSetTest(APITestCase):
    def setUp(self):
        # 네 명의 사용자 생성
        self.user1 = Users.objects.create_user(intra_id="user1")
        self.user2 = Users.objects.create_user(intra_id="user2")
        self.user3 = Users.objects.create_user(intra_id="user3")
        self.user4 = Users.objects.create_user(intra_id="user4")
        # 토너먼트 로그 URL
        self.tournament_name = "test"
        self.create_log = reverse("create_tournament_game_logs")
        self.start_time = make_aware(datetime(2021, 1, 1, 0, 0, 0))
        self.end_time = make_aware(datetime(2021, 1, 2, 1, 0, 0))

    def test_create_tournament_game_log_without_authenticate(self):
        """
        인증이 없을때 403 에러 확인
        """
        data = {
            "tournament_name": self.tournament_name,
            "round": 1,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user2.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_tournament_game_log(self):
        """
        토너먼트 생성 확인
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "tournament_name": self.tournament_name,
            "round": 1,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user2.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # TournamentGameLogs 모델에서 데이터가 잘 들어갔는지 확인
        game_log = TournamentGameLogs.objects.get(
            tournament_name=response.data["tournament_name"]
        )
        self.assertEqual(game_log.tournament_name, self.tournament_name)
        self.assertEqual(game_log.round, 1)
        self.assertEqual(game_log.player1.intra_id, self.user1.intra_id)
        self.assertEqual(game_log.player2.intra_id, self.user2.intra_id)
        self.assertEqual(game_log.start_time, self.start_time)
        self.assertEqual(game_log.end_time, self.end_time)
        self.assertEqual(game_log.is_final, False)

    def test_create_tournament_game_log_same_player1_player2(self):
        """
        player1랑 player2가 같을때 테스트
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "tournament_name": self.tournament_name,
            "round": 1,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user1.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_tournament_multi_game_log(self):
        """
        토너먼트 여러개 생성 확인 테스트
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "tournament_name": self.tournament_name,
            "round": 1,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user2.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data2 = {
            "tournament_name": self.tournament_name,
            "round": 2,
            "player1_intra_id": self.user3.intra_id,
            "player2_intra_id": self.user4.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data2)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data3 = {
            "tournament_name": self.tournament_name,
            "round": 3,
            "player1_intra_id": self.user3.intra_id,
            "player2_intra_id": self.user1.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": True,
        }
        response = self.client.post(self.create_log, data3)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_tournament_game_log_tournament_name_and_round_is_unique(self):
        """
        토너먼트 이름과 라운드 조합은 유일한가 테스트
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "tournament_name": self.tournament_name,
            "round": 1,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user2.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data2 = {
            "tournament_name": self.tournament_name,
            "round": 1,
            "player1_intra_id": self.user3.intra_id,
            "player2_intra_id": self.user4.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data2)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_tournament_game_log_with_tournament_name(self):
        """
        tournament_name 조회 및 uuid로 조회가 잘 되는지 테스트
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "tournament_name": self.tournament_name,
            "round": 1,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user2.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data2 = {
            "tournament_name": self.tournament_name,
            "round": 2,
            "player1_intra_id": self.user3.intra_id,
            "player2_intra_id": self.user4.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }

        response = self.client.post(self.create_log, data2)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data3 = {
            "tournament_name": self.tournament_name,
            "round": 3,
            "player1_intra_id": self.user3.intra_id,
            "player2_intra_id": self.user1.intra_id,
            "player1_score": 5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": True,
        }
        response = self.client.post(self.create_log, data3)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.get(
            reverse("tournament_name_logs", kwargs={"name": self.tournament_name})
        )
        assert len(response.data) == 3
        self.assertEqual(self.user1.intra_id, response.data[0]["player1"]["intra_id"])
        self.assertEqual(self.user3.intra_id, response.data[1]["player1"]["intra_id"])
        self.assertEqual(self.user3.intra_id, response.data[2]["player1"]["intra_id"])

        response = self.client.get(
            reverse(
                "tournament_game_user_logs", kwargs={"intra_id": self.user1.intra_id}
            )
        )
        assert len(response.data) == 2
        self.assertEqual(1, response.data[0]["round"])
        self.assertEqual(3, response.data[1]["round"])

    def test_score_minus(self):
        """
        점수가 음수일 때 테스트
        """
        self.client.force_authenticate(user=self.user1)
        data = {
            "tournament_name": self.tournament_name,
            "round": 1,
            "player1_intra_id": self.user1.intra_id,
            "player2_intra_id": self.user2.intra_id,
            "player1_score": -5,
            "player2_score": 3,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "is_final": False,
        }
        response = self.client.post(self.create_log, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
