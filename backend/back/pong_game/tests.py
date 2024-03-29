import asyncio
import datetime
import json
import uuid
import time
from typing import List, Dict
from unittest.mock import patch

from back.asgi import (
    application,
)

from django.test import TestCase
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from accounts.models import Users, UserStatusEnum
from pong_game.module.GameSetValue import (
    MessageType,
    ResultType,
    NOT_ALLOWED_TOURNAMENT_NAME,
)
from games.models import GeneralGameLogs
from pong_game.consumers import ACTIVE_TOURNAMENTS
from pong_game.module.Tournament import Tournament
from django.utils import timezone
from games.models import TournamentGameLogs


class LoginConsumerTests(TestCase):
    @database_sync_to_async
    def create_test_user(self, intra_id):
        # 테스트 사용자 생성
        return get_user_model().objects.create_user(intra_id=intra_id)

    @database_sync_to_async
    def delete_test_user(self, user):
        # 테스트 사용자 삭제
        user.delete()

    @database_sync_to_async
    def get_user_status(self, user):
        # 데이터베이스에서 사용자 상태 조회
        return Users.objects.get(user_id=user.user_id).status

    async def test_authenticated_user_connection(self):
        """
        인증된 유저의 경우 접속 테스트
        """
        self.user = await self.create_test_user(intra_id="1")
        communicator = WebsocketCommunicator(application, "/ws/login/")
        # user 인증
        communicator.scope["user"] = self.user

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        user_status = await self.get_user_status(self.user)
        self.assertEqual(user_status, UserStatusEnum.ONLINE)

        # 연결 해제 및 상태 확인
        await communicator.disconnect()
        user_status = await self.get_user_status(self.user)
        self.assertEqual(user_status, UserStatusEnum.OFFLINE)

    async def test_unauthenticated_user_connection(self):
        """
        인증이 되지 않는 유저의 경우 접속 테스트
        """
        communicator = WebsocketCommunicator(application, "/ws/login/")

        connected, _ = await communicator.connect()
        self.assertFalse(connected)


class GeneralGameWaitConsumerTests(TestCase):
    @database_sync_to_async
    def create_test_user(self, intra_id):
        # 테스트 사용자 생성
        return get_user_model().objects.create_user(intra_id=intra_id)

    @database_sync_to_async
    def delete_test_user(self, user):
        # 테스트 사용자 삭제
        user.delete()

    async def test_authenticated_user_connection(self):
        """
        2명 접속시 game_id, player1, 2 인트라 아이디 받는지 확인
        """
        self.user1 = await self.create_test_user(intra_id="test1")
        self.user2 = await self.create_test_user(intra_id="test2")
        communicator1 = WebsocketCommunicator(application, "/ws/general_game/wait/")
        # user 인증
        communicator1.scope["user"] = self.user1
        # 접속 확인
        connected, _ = await communicator1.connect()
        self.assertTrue(connected)

        communicator2 = WebsocketCommunicator(application, "/ws/general_game/wait/")
        communicator2.scope["user"] = self.user2
        # 접속 확인
        connected, _ = await communicator2.connect()
        self.assertTrue(connected)

        # user1 응답 확인
        user1_response = await communicator1.receive_from()
        user1_response_dict = json.loads(user1_response)

        # user2 응답 확인
        user2_response = await communicator2.receive_from()
        user2_response_dict = json.loads(user2_response)

        # game_id 동일 한지 확인
        self.assertEqual(user1_response_dict["game_id"], user2_response_dict["game_id"])


class GeneralGameConsumerTests(TestCase):
    @database_sync_to_async
    def create_test_user(self, intra_id):
        # 테스트 사용자 생성
        return get_user_model().objects.create_user(intra_id=intra_id)

    @database_sync_to_async
    def delete_test_user(self, user):
        # 테스트 사용자 삭제
        user.delete()

    @database_sync_to_async
    def get_general_game_data(self, player_num: int, player):
        try:
            if player_num == 1:
                return GeneralGameLogs.objects.get(player1=player.user_id)
            elif player_num == 2:
                return GeneralGameLogs.objects.get(player2=player.user_id)
        except GeneralGameLogs.DoesNotExist:
            return None

    # polling 형식으로 데이터 가져오기
    async def wait_for_game_data(self, player_num: int, player, timeout=5):
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                game_data = await self.get_general_game_data(
                    player_num=player_num, player=player
                )
                if game_data:
                    return game_data
            except GeneralGameLogs.DoesNotExist:
                await asyncio.sleep(0.2)
        return None

    async def setup_game_environment_before_start(self) -> tuple:
        """
        start 전까지 환경 세팅
        """

        self.user1 = await self.create_test_user(intra_id="test1")
        self.user2 = await self.create_test_user(intra_id="test2")
        # 대기방 입장 및 게임 id 생성
        communicator1 = WebsocketCommunicator(application, "/ws/general_game/wait/")
        communicator1.scope["user"] = self.user1
        # 접속 확인
        connected, _ = await communicator1.connect()
        self.assertTrue(connected)

        communicator2 = WebsocketCommunicator(application, "/ws/general_game/wait/")
        communicator2.scope["user"] = self.user2
        # 접속 확인
        connected, _ = await communicator2.connect()
        self.assertTrue(connected)

        user_response = await communicator1.receive_from()
        user_response_dict = json.loads(user_response)

        await communicator1.disconnect()
        await communicator2.disconnect()

        # 게임방 입장
        self.game_id = user_response_dict["game_id"]
        communicator3 = WebsocketCommunicator(
            application, f"/ws/general_game/{self.game_id}/"
        )

        communicator3.scope["user"] = self.user1
        connected, _ = await communicator3.connect()
        self.assertTrue(connected)

        communicator4 = WebsocketCommunicator(
            application, f"/ws/general_game/{self.game_id}/"
        )

        communicator4.scope["user"] = self.user2
        connected, _ = await communicator4.connect()
        self.assertTrue(connected)

        await communicator3.send_to(
            text_data=json.dumps(
                {
                    "message_type": "ready",
                    "intra_id": "test1",
                    "number": "player1",
                }
            )
        )

        await communicator4.send_to(
            text_data=json.dumps(
                {
                    "message_type": "ready",
                    "intra_id": "test2",
                    "number": "player2",
                }
            )
        )

        # ready 제거
        tmp = await communicator3.receive_from()
        tmp = await communicator3.receive_from()

        return communicator3, communicator4

    async def test_wrong_game_id(self):
        """
        game_id가 잘못된 경우 접속 실패
        """
        self.user1 = await self.create_test_user(intra_id="test1")
        communicator1 = WebsocketCommunicator(
            application, f"/ws/general_game/{uuid.uuid4()}/"
        )
        communicator1.scope["user"] = self.user1
        connected, _ = await communicator1.connect()
        self.assertFalse(connected)

    async def test_authenticated_user_connection(self):
        """
        두 명 접속시 message_type 잘 보내는지 확인
        """
        self.user1 = await self.create_test_user(intra_id="test3")
        self.user2 = await self.create_test_user(intra_id="test4")

        # 대기방 입장 및 게임 id 생성
        communicator1 = WebsocketCommunicator(application, "/ws/general_game/wait/")
        communicator1.scope["user"] = self.user1
        await communicator1.connect()

        communicator2 = WebsocketCommunicator(application, "/ws/general_game/wait/")
        communicator2.scope["user"] = self.user2
        await communicator2.connect()

        user_response = await communicator1.receive_from()
        user_response_dict = json.loads(user_response)

        await communicator1.disconnect()
        await communicator2.disconnect()

        # 게임방 입장
        self.game_id = user_response_dict["game_id"]
        communicator1 = WebsocketCommunicator(
            application, f"/ws/general_game/{self.game_id}/"
        )

        # user 인증
        communicator1.scope["user"] = self.user1
        # 접속 확인
        connected, _ = await communicator1.connect()
        self.assertTrue(connected)

        # user1 응답 확인
        user1_response = await communicator1.receive_from()
        user1_response_dict = json.loads(user1_response)
        self.assertEqual(user1_response_dict["message_type"], "ready")
        self.assertEqual(user1_response_dict["intra_id"], self.user1.intra_id)
        self.assertEqual(user1_response_dict["number"], "player1")

        communicator2 = WebsocketCommunicator(
            application, f"/ws/general_game/{self.game_id}/"
        )
        # user 인증
        communicator2.scope["user"] = self.user2
        # 접속 확인
        connected, _ = await communicator2.connect()
        self.assertTrue(connected)

        # user2 응답 확인
        user2_response = await communicator2.receive_from()
        user2_response_dict = json.loads(user2_response)
        self.assertEqual(user2_response_dict["message_type"], "ready")
        self.assertEqual(user2_response_dict["intra_id"], self.user2.intra_id)
        self.assertEqual(user2_response_dict["number"], "player2")

        # user1,2 응답
        await communicator1.send_to(text_data=user1_response)
        await communicator2.send_to(text_data=user2_response)

        # user1, user2 start 메시지 확인
        user1_second_response = await communicator1.receive_from()
        user1_second_dict = json.loads(user1_second_response)
        self.assertEqual(user1_second_dict["message_type"], "start")
        self.assertEqual(user1_second_dict["1p"], self.user1.intra_id)
        self.assertEqual(user1_second_dict["2p"], self.user2.intra_id)

        user2_second_response = await communicator2.receive_from()
        user2_second_dict = json.loads(user2_second_response)
        self.assertEqual(user2_second_dict["message_type"], "start")
        self.assertEqual(user2_second_dict["1p"], self.user1.intra_id)
        self.assertEqual(user2_second_dict["2p"], self.user2.intra_id)

        # disconnect 안하면 밑에서 에러 발생
        await communicator1.disconnect()
        await communicator2.disconnect()

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", -300)
    async def test_save_game_data_to_db(self):
        """
        게임 종료시 db에 잘 저장하는지 확인
        공 속도는 test 할때 50배로
        """
        communicator1, communicator2 = await self.setup_game_environment_before_start()

        # 왼쪽으로 player1 패들을 이동
        await communicator1.send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        while True:
            user1_response = await communicator1.receive_from()
            user1_dict = json.loads(user1_response)
            if user1_dict["message_type"] == "end":
                break

        # end 메세지를 consumer로 날림
        await communicator1.send_to(
            text_data=json.dumps(
                {
                    "message_type": "end",
                }
            )
        )
        user1_response = await communicator1.receive_from()
        user1_dict = json.loads(user1_response)
        self.assertEqual(user1_dict["message_type"], MessageType.COMPLETE.value)

        # db 저장 될 때 까지 0.2초씩 기다림 timeout은 2초
        game_data_from_db = await self.wait_for_game_data(
            player_num=1, player=self.user1, timeout=2
        )

        # 2초동안 못받아오면 실패
        if game_data_from_db is None:
            self.assertTrue(False)

        self.assertEqual(game_data_from_db.player1_id, self.user1.user_id)
        self.assertEqual(game_data_from_db.player2_id, self.user2.user_id)
        self.assertEqual(game_data_from_db.player1_score, 0)
        self.assertEqual(game_data_from_db.player2_score, 5)

        await communicator1.disconnect()
        await communicator2.disconnect()

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", -300)
    async def test_move_paddle_logic_1(self):
        """
        패들 움직임을 제대로 작동하는지 테스트
        1. 1p 왼쪽 이동시 패들이 -인지
        2. 2p 오른쪽 이동시 패들의 x방향이 +인지
        3. 공이 시작시 -로 날라가는지(나중에 변경 될 수도 있음)
        4. 1p를 왼쪽으로 움직인 상태로 고정 했을때 1p 패들과 공이 충돌하지 않는지
        """

        communicator1, communicator2 = await self.setup_game_environment_before_start()

        # 왼쪽으로 player1 패들을 이동
        await communicator1.send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        # 왼쪽으로 player2 패들을 이동
        await communicator2.send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player2", "input": "left_press"}
            )
        )

        while True:
            user1_response = await communicator1.receive_from()
            user1_dict = json.loads(user1_response)

            if user1_dict["message_type"] == "playing":
                # 1. 1p 왼쪽 이동시 1p 패들이 - 인지
                self.assertTrue(user1_dict["paddle1"] < 0)
                # 2. 2p 왼쪽 이동시 2p 패들이 + 인지
                self.assertTrue(user1_dict["paddle2"] > 0)
                # 3. 볼이 시작시 -로 이동하는지, 4. 1p와 충돌 안 하는지(충돌하면 ball_vz의 음수에서 양수가 됨)
                self.assertTrue(user1_dict["ball_vz"] < 0)
            if user1_dict["message_type"] == "end":
                break

        await communicator1.disconnect()
        await communicator2.disconnect()

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", -300)
    async def test_move_paddle_logic_2(self):
        """
        1. 1p 오른쪽 이동시 패들이 x방향이 +인지
        2. 2p 왼쪽 이동시 패들의 x방향이 -인지
        """

        communicator1, communicator2 = await self.setup_game_environment_before_start()

        # 오른쪽으로 player1 패들을 이동
        await communicator1.send_to(
            text_data=json.dumps(
                {
                    "message_type": "playing",
                    "number": "player1",
                    "input": "right_press",
                }
            )
        )

        # 오른쪽으로 player2 패들을 이동
        await communicator2.send_to(
            text_data=json.dumps(
                {
                    "message_type": "playing",
                    "number": "player2",
                    "input": "right_press",
                }
            )
        )

        while True:
            user1_response = await communicator1.receive_from()
            user1_dict = json.loads(user1_response)
            if user1_dict["message_type"] == "playing":
                # 1. 1p 왼쪽 이동시 1p 패들이 - 인지
                self.assertTrue(user1_dict["paddle1"] > 0)
                # 2. 2p 왼쪽 이동시 2p 패들이 + 인지
                self.assertTrue(user1_dict["paddle2"] < 0)
            if user1_dict["message_type"] == "end":
                break

        await communicator1.disconnect()
        await communicator2.disconnect()


class TournamentGameWaitConsumerTests(TestCase):
    expected_tournaments_data: list[dict[str, str]]
    TEST_TOURNAMENTS_INFO = [
        {
            "tournament_name": "test_tournament1",
            "create_user_intra_id": "test_intra_id1",
            "wait_num": "1",
        },
        {
            "tournament_name": "test_tournament2",
            "create_user_intra_id": "test_intra_id2",
            "wait_num": "1",
        },
    ]

    @database_sync_to_async
    def create_test_tournament_log(self, tournament_name: str):
        # 테스트 사용자 생성
        TournamentGameLogs.objects.create(
            tournament_name=tournament_name,
            round=1,
            player1=get_user_model().objects.create_user(intra_id="default1"),
            player2=get_user_model().objects.create_user(intra_id="default2"),
            player1_score=5,
            player2_score=0,
            start_time=timezone.now() - datetime.timedelta(hours=5),
            end_time=timezone.now(),
            is_final=False,
        )

    @database_sync_to_async
    def create_test_user(self, intra_id):
        # 테스트 사용자 생성
        return get_user_model().objects.create_user(intra_id=intra_id)

    @database_sync_to_async
    def delete_test_user(self, user):
        # 테스트 사용자 삭제
        user.delete()

    def setUp(self):
        """
        가짜 토너먼트 데이터 준비
        """
        self.fake_tournaments = {
            tournament_info["tournament_name"]: Tournament(
                tournament_name=tournament_info["tournament_name"],
                create_user_intra_id=tournament_info["create_user_intra_id"],
            )
            for tournament_info in self.TEST_TOURNAMENTS_INFO
        }
        # 가짜 데이터를 ACTIVE_TOURNAMENTS에 주입
        ACTIVE_TOURNAMENTS.update(self.fake_tournaments)

        self.expected_tournaments_data = [
            {
                "tournament_name": tournament_info["tournament_name"],
                "wait_num": tournament_info["wait_num"],
            }
            for tournament_info in self.TEST_TOURNAMENTS_INFO
        ]

    def tearDown(self):
        """
        테스트 후 토너먼트 데이터 삭제
        """
        for key in self.fake_tournaments.keys():
            del ACTIVE_TOURNAMENTS[key]

    async def send_and_receive(self, communicator, message_data):
        """
        특정 데이터를 전송하고 응답을 받아오는 함수
        """

        # 메시지 전송
        await communicator.send_to(text_data=json.dumps(message_data))

        # 응답 수신
        response = await communicator.receive_from()
        return json.loads(response)

    async def test_receive_active_tournamnet_data(self):
        """
        현재 존재하는 토너먼트 방을 잘 받아오는지 테스트
        """

        self.user1 = await self.create_test_user(intra_id="test1")
        communicator1 = WebsocketCommunicator(application, "/ws/tournament_game/wait/")
        communicator1.scope["user"] = self.user1
        connected, _ = await communicator1.connect()
        # 접속 확인
        self.assertTrue(connected)

        # 연결시 서버에서 던져주는 gamelist 저장
        response = await communicator1.receive_from()
        response_dict = json.loads(response)

        # 받아온 game_list랑 expected_tournaments_data 길이 확인
        self.assertEqual(
            len(response_dict["game_list"]), len(self.expected_tournaments_data)
        )

        # 데이터가 동일한지 확인
        for actual, expected in zip(
            response_dict["game_list"], self.expected_tournaments_data
        ):
            self.assertEqual(actual["tournament_name"], expected["tournament_name"])
            self.assertEqual(actual["wait_num"], expected["wait_num"])

    async def test_receive_success_or_fail_data(self):
        """
        토너먼트 네임을 consumer에게 보냈을때 성공 또는 실패를 클라이언트에게 잘 보내는지 테스트
        """

        self.user1 = await self.create_test_user(intra_id="test1")
        communicator1 = WebsocketCommunicator(application, "/ws/tournament_game/wait/")
        communicator1.scope["user"] = self.user1
        connected, _ = await communicator1.connect()
        # 접속 확인
        self.assertTrue(connected)

        # 연결시 서버에서 던져주는 gamelist 저장
        response = await communicator1.receive_from()
        response_dict = json.loads(response)
        existent_tournament_name = response_dict["game_list"][0]["tournament_name"]

        # consumer가 fail를 보내는지 테스트
        # 1. 현재 존재하는 토너먼트 네임을 보낼때
        response_dict = await self.send_and_receive(
            communicator1,
            {
                "message_type": MessageType.CREATE.value,
                "tournament_name": existent_tournament_name,
            },
        )
        self.assertEqual(response_dict["message_type"], MessageType.CREATE.value)
        self.assertEqual(response_dict["result"], ResultType.FAIL.value)

        # consumer가 fail를 보내는지 테스트
        # 2. 금지된 토너먼트 네임을 보낼때
        response_dict = await self.send_and_receive(
            communicator1,
            {
                "message_type": MessageType.CREATE.value,
                "tournament_name": NOT_ALLOWED_TOURNAMENT_NAME,
            },
        )

        self.assertEqual(response_dict["message_type"], MessageType.CREATE.value)
        self.assertEqual(response_dict["result"], ResultType.FAIL.value)

        # consumer가 fail를 보내는지 테스트
        # 3. 토너먼트 네임이 존재하지 않을때
        response_dict = await self.send_and_receive(
            communicator1,
            {
                "message_type": MessageType.CREATE.value,
            },
        )

        self.assertEqual(response_dict["message_type"], MessageType.CREATE.value)
        self.assertEqual(response_dict["result"], ResultType.FAIL.value)

        # consumer가 fail를 보내는지 테스트
        # 4. db에 이미 존재하는 경우
        tournament_name = "haha"
        await self.create_test_tournament_log(tournament_name=tournament_name)
        response_dict = await self.send_and_receive(
            communicator1,
            {
                "message_type": MessageType.CREATE.value,
                "tournament_name": tournament_name,
            },
        )

        self.assertEqual(response_dict["message_type"], MessageType.CREATE.value)
        self.assertEqual(response_dict["result"], ResultType.FAIL.value)

        # consumer가 success를 보내는지 테스트
        response_dict = await self.send_and_receive(
            communicator1,
            {
                "message_type": MessageType.CREATE.value,
                "tournament_name": "nonexistent_tournament_name",
            },
        )

        self.assertEqual(response_dict["message_type"], MessageType.CREATE.value)
        self.assertEqual(response_dict["result"], ResultType.SUCCESS.value)

        # 성공 이후 다시 보내는 테스트 아무것도 받지 말아야함
        await communicator1.send_to(
            text_data=json.dumps(
                {
                    "message_type": MessageType.CREATE.value,
                    "tournament_name": "nonexistent_tournament_name",
                }
            )
        )

        try:
            response = await communicator1.receive_from(timeout=1)
        except TimeoutError:
            response = None

        self.assertEqual(response, None)
