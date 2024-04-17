import asyncio
import datetime
import json
import uuid
import time
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
    PlayerNumber,
    TournamentStatus,
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
    def create_test_user(self, intra_id, nickname=None):
        # 테스트 사용자 생성
        if nickname:
            return get_user_model().objects.create_user(
                intra_id=intra_id, nickname=nickname
            )
        return get_user_model().objects.create_user(intra_id=intra_id)

    @database_sync_to_async
    def delete_test_user(self, user):
        # 테스트 사용자 삭제
        user.delete()

    @database_sync_to_async
    def get_user(self, intra_id: str):
        # 데이터베이스에서 사용자 조회
        return Users.objects.get(intra_id=intra_id)

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

        self.user1 = await self.create_test_user(
            intra_id="test1", nickname="test1_nickname"
        )
        self.user2 = await self.create_test_user(
            intra_id="test2", nickname="test2_nickname"
        )
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
                    "nickname": "test1_nickname",
                    "number": "player1",
                }
            )
        )

        await communicator4.send_to(
            text_data=json.dumps(
                {
                    "message_type": "ready",
                    "nickname": "test2_nickname",
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
        self.user1 = await self.create_test_user(
            intra_id="test3", nickname="test3_nickname"
        )
        self.user2 = await self.create_test_user(
            intra_id="test4", nickname="test4_nickname"
        )

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
        self.assertEqual(user1_response_dict["nickname"], self.user1.nickname)
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
        self.assertEqual(user2_response_dict["nickname"], self.user2.nickname)
        self.assertEqual(user2_response_dict["number"], "player2")

        # user1,2 응답
        await communicator1.send_to(text_data=user1_response)
        await communicator2.send_to(text_data=user2_response)

        # user1, user2 start 메시지 확인
        user1_second_response = await communicator1.receive_from()
        user1_second_dict = json.loads(user1_second_response)
        self.assertEqual(user1_second_dict["message_type"], "start")
        self.assertEqual(user1_second_dict["1p"], self.user1.nickname)
        self.assertEqual(user1_second_dict["2p"], self.user2.nickname)

        user2_second_response = await communicator2.receive_from()
        user2_second_dict = json.loads(user2_second_response)
        self.assertEqual(user2_second_dict["message_type"], "start")
        self.assertEqual(user2_second_dict["1p"], self.user1.nickname)
        self.assertEqual(user2_second_dict["2p"], self.user2.nickname)

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

        while True:
            user2_response = await communicator2.receive_from()
            user2_dict = json.loads(user2_response)
            if user2_dict["message_type"] == "end":
                break

        # end 메세지를 consumer로 날림
        await communicator1.send_to(
            text_data=json.dumps(
                {
                    "message_type": "end",
                }
            )
        )
        await communicator2.send_to(
            text_data=json.dumps(
                {
                    "message_type": "end",
                }
            )
        )

        # 승자만 db 관련 메시지를 받음
        user2_response = await communicator2.receive_from()
        user2_dict = json.loads(user2_response)
        self.assertEqual(user2_dict["message_type"], MessageType.COMPLETE.value)
        self.assertEqual(user2_dict["player1"], "test1_nickname")
        self.assertEqual(user2_dict["player2"], "test2_nickname")

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

        # 유저 데이터 확인
        test1 = await self.get_user(intra_id="test1")
        test2 = await self.get_user(intra_id="test2")
        self.assertEqual(test1.win_count, 0)
        self.assertEqual(test2.win_count, 1)
        self.assertEqual(test1.lose_count, 1)
        self.assertEqual(test2.lose_count, 0)

        await communicator1.disconnect()
        await communicator2.disconnect()

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", 300)
    async def test_move_paddle_logic_1(self):
        """
        패들 움직임을 제대로 작동하는지 테스트
        1. 1p 왼쪽 이동시 패들이 -인지
        2. 2p 오른쪽 이동시 패들의 x방향이 +인지
        3. 공이 시작시 +로 날라가는지(나중에 변경 될 수도 있음)
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
                # 3. 볼이 시작시 +로 이동하는지, 4. 1p와 충돌 안 하는지(충돌하면 ball_vz의 음수에서 양수가 됨)
                self.assertTrue(user1_dict["ball_vz"] > 0)
            if user1_dict["message_type"] == "end":
                break

        await communicator1.disconnect()
        await communicator2.disconnect()

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", 300)
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
            "create_user_nickname": "test_nickname1",
            "wait_num": "1",
        },
        {
            "tournament_name": "test_tournament2",
            "create_user_intra_id": "test_intra_id2",
            "create_user_nickname": "test_nickname2",
            "wait_num": "1",
        },
    ]

    @database_sync_to_async
    def create_test_tournament_log(self, tournament_name: str):
        # 테스트 사용자 생성
        TournamentGameLogs.objects.create(
            tournament_name=tournament_name,
            round=1,
            player1=get_user_model().objects.create_user(
                intra_id="default1", nickname="default1_nickname"
            ),
            player2=get_user_model().objects.create_user(
                intra_id="default2", nickname="default2_nickname"
            ),
            player1_score=5,
            player2_score=0,
            start_time=timezone.now() - datetime.timedelta(hours=5),
            end_time=timezone.now(),
            is_final=False,
        )

    @database_sync_to_async
    def create_test_user(self, intra_id, nickname):
        # 테스트 사용자 생성
        return get_user_model().objects.create_user(
            intra_id=intra_id, nickname=nickname
        )

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
                create_user_nickname=tournament_info["create_user_nickname"],
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

    async def test_receive_active_tournament_data(self):
        """
        현재 존재하는 토너먼트 방을 잘 받아오는지 테스트
        """

        self.user1 = await self.create_test_user(
            intra_id="test1", nickname="test1_nickname"
        )
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

        self.user1 = await self.create_test_user(
            intra_id="test1", nickname="test1_nickname"
        )
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


class TournamentGameConsumerTests(TestCase):
    expected_tournaments_data: list[dict[str, str]]
    TEST_TOURNAMENTS_INFO = [
        {
            "tournament_name": "test_tournament1",
            "create_user_intra_id": "room_1_owner",
            "create_user_nickname": "room_1_owner_nickname",
            "wait_num": "1",
        },
        {
            "tournament_name": "test_tournament2",
            "create_user_intra_id": "room_2_owner",
            "create_user_nickname": "room_2_owner_nickname",
            "wait_num": "1",
        },
    ]

    def __init__(self, methodName: str = ...):
        super().__init__(methodName)
        self.room_1_name = "test_tournament1"
        self.room_2_name = "test_tournament2"
        self.room_1_owner_id = "room_1_owner"
        self.room_1_user1_id = "room_1_user1"
        self.room_1_user2_id = "room_1_user2"
        self.room_1_user3_id = "room_1_user3"
        self.room_2_owner_id = "room_2_owner"
        self.room_2_user1_id = "room_2_user1"
        self.room_2_user2_id = "room_2_user2"
        self.room_2_user3_id = "room_2_user3"
        self.suffix = "_nickname"

    @database_sync_to_async
    def create_test_user(self, intra_id, nickname):
        # 테스트 사용자 생성
        return get_user_model().objects.create_user(
            intra_id=intra_id, nickname=nickname
        )

    @database_sync_to_async
    def delete_test_user(self, user):
        # 테스트 사용자 삭제
        user.delete()

    @database_sync_to_async
    def get_user(self, intra_id: str):
        # 데이터베이스에서 사용자 조회
        return Users.objects.get(intra_id=intra_id)

    def setUp(self):
        """
        가짜 토너먼트 데이터 준비
        """
        self.fake_tournaments = {
            tournament_info["tournament_name"]: Tournament(
                tournament_name=tournament_info["tournament_name"],
                create_user_intra_id=tournament_info["create_user_intra_id"],
                create_user_nickname=tournament_info["create_user_nickname"],
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

    async def connect_and_echo_data(self, tournament_name: str, user: Users) -> tuple:
        """
        연결하고 받은 메시지를 그대로 다시 보내는 함수
        """
        communicator = WebsocketCommunicator(
            application, f"/ws/tournament_game/{tournament_name}/"
        )
        communicator.scope["user"] = user
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        response = await communicator.receive_from()
        await communicator.send_to(response)
        response_dict = json.loads(response)
        return communicator, response_dict

    async def discard_all_message(self, communicators: list):
        for communicator in communicators:
            while await communicator.receive_nothing() is False:
                message = await communicator.receive_from()

    async def perform_test_sequence(
        self, tournament_name: str, users_info: list[dict]
    ) -> list:
        """
        특정 토너먼트에 대해 사용자 생성, 연결 및 대기 메시지 확인을 수행하는 메서드.
        communicators를 반환
        """
        communicators = []
        total_num = 1
        for user_info in users_info:
            user = await self.create_test_user(
                intra_id=user_info["intra_id"],
                nickname=user_info["intra_id"] + self.suffix,
            )
            communicator, response_dict = await self.connect_and_echo_data(
                tournament_name=tournament_name, user=user
            )

            self.assertEqual(response_dict["message_type"], MessageType.WAIT.value)
            self.assertEqual(response_dict["nickname"], user.nickname)
            self.assertEqual(response_dict["total"], total_num)
            self.assertEqual(
                response_dict["number"], user_info["expected_player_number"].value
            )

            communicators.append(communicator)
            total_num += 1
        return communicators

    async def check_recieved_ready_messgae_valid(
        self, users_ready_info: list[dict], communicators: list
    ) -> None:
        """
        ready_message가 있는지, 그 값이 올바른지 확인
        """
        info_index: int = 0
        has_ready_message: bool = False
        for communicator in communicators:
            while await communicator.receive_nothing() is False:
                message = await communicator.receive_from()
                message_dict = json.loads(message)
                if message_dict["message_type"] == MessageType.READY.value:
                    self.assertEqual(
                        message_dict["round"], users_ready_info[info_index]["round"]
                    )
                    self.assertEqual(
                        message_dict["1p"], users_ready_info[info_index]["1p"]
                    )
                    self.assertEqual(
                        message_dict["2p"], users_ready_info[info_index]["2p"]
                    )
                    info_index += 1
                    has_ready_message = True
            if has_ready_message is False:
                self.assertTrue(False)

    async def test_receive_wait_ready_data(self):
        users_info_test_tournament1 = [
            {
                "nickname": self.room_1_owner_id + self.suffix,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "nickname": self.room_1_user1_id + self.suffix,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
            {
                "nickname": self.room_1_user2_id + self.suffix,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
            {
                "nickname": self.room_1_user3_id + self.suffix,
                "expected_player_number": PlayerNumber.PLAYER_4,
            },
        ]

        users_info_test_tournament2 = [
            {
                "nickname": self.room_2_owner_id + self.suffix,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "nickname": self.room_2_user1_id + self.suffix,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
            {
                "nickname": self.room_2_user2_id + self.suffix,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
            {
                "nickname": self.room_2_user3_id + self.suffix,
                "expected_player_number": PlayerNumber.PLAYER_4,
            },
        ]

        # 방 1: [Back] 클라이언트에게 wait 전송과 그 값 그대로 [Front] wait 수신하고 Back에게 wait 전송까지
        # wait 값 확인하는 절차도 있음
        self.test_tournament1_communicators = await self.perform_test_sequence(
            self.room_1_name, users_info_test_tournament1
        )

        # 방 2: [Back] 클라이언트에게 wait 전송과 그 값 그대로 [Front] wait 수신하고 Back에게 wait 전송까지
        # wait 값 확인하는 절차도 있음
        self.test_tournament2_communicators = await self.perform_test_sequence(
            self.room_2_name, users_info_test_tournament2
        )

        users_ready_info_test_tournament1 = [
            {
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
            {
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
        ]

        users_ready_info_test_tournament2 = [
            {
                "round": "1",
                "1p": self.room_2_owner_id + self.suffix,
                "2p": self.room_2_user1_id + self.suffix,
            },
            {
                "round": "1",
                "1p": self.room_2_owner_id + self.suffix,
                "2p": self.room_2_user1_id + self.suffix,
            },
            {
                "round": "2",
                "1p": self.room_2_user2_id + self.suffix,
                "2p": self.room_2_user3_id + self.suffix,
            },
            {
                "round": "2",
                "1p": self.room_2_user2_id + self.suffix,
                "2p": self.room_2_user3_id + self.suffix,
            },
        ]

        # 방 1 유저들이 ready 메시지를 잘 받았는지 확인
        await self.check_recieved_ready_messgae_valid(
            users_ready_info=users_ready_info_test_tournament1,
            communicators=self.test_tournament1_communicators,
        )

        # 방 2 유저들이 ready 메시지를 잘 받았는지 확인
        await self.check_recieved_ready_messgae_valid(
            users_ready_info=users_ready_info_test_tournament2,
            communicators=self.test_tournament2_communicators,
        )

    async def test_disconnect_test1(self):
        """
        1. 방 인원이 3명이고 정상적으로 전부 다 나갔을때 방이 사라지는지(4명 전부 다 있으면 다음 consumer에서 처리해야함)
        """

        users_info_test_tournament1 = [
            {
                "intra_id": self.room_1_owner_id,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "intra_id": self.room_1_user1_id,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
            {
                "intra_id": self.room_1_user2_id,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
        ]

        self.test_tournament1_communicators = await self.perform_test_sequence(
            self.room_1_name, users_info_test_tournament1
        )

        # 방이 있는지 확인
        self.assertTrue(ACTIVE_TOURNAMENTS.get("test_tournament1"))
        # 방에 있는 인원 모두 연결 끊기
        for communicator in self.test_tournament1_communicators:
            await communicator.disconnect()
        # 방이 사라졌는지 확인
        self.assertFalse(ACTIVE_TOURNAMENTS.get("test_tournament1"))

    async def test_disconnect_test2(self):
        """
        2. 방 인원이 2명 이상일때 나가면 1명으로 바뀌는지, 또 그 방에 들어가면 변화가 없는지
        3. 방 인원이 2명 이고 처음에 들어온 사람이 나가고 다시 들어오면 player_list 1번 자리에 차는지
        """
        users_info_test_tournament1 = [
            {
                "intra_id": self.room_1_owner_id,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "intra_id": self.room_1_user1_id,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
        ]

        # 두 명 참가
        self.test_tournament1_communicators = await self.perform_test_sequence(
            self.room_1_name, users_info_test_tournament1
        )

        tournament = ACTIVE_TOURNAMENTS.get(self.room_1_name)

        # 방이 있는지 확인
        self.assertTrue(ACTIVE_TOURNAMENTS.get(self.room_1_name))

        # 두 명 중 한명만 끊기
        await self.test_tournament1_communicators[0].disconnect()

        # 방이 안 사라졌는지 확인
        self.assertTrue(ACTIVE_TOURNAMENTS.get(self.room_1_name))
        tournament = ACTIVE_TOURNAMENTS.get(self.room_1_name)
        self.assertEqual(tournament.tournament_name, self.room_1_name)
        self.assertEqual(tournament.player_list[0], None)
        self.assertEqual(tournament.player_list[1].get_intra_id(), self.room_1_user1_id)
        self.assertEqual(tournament.player_total_cnt, 1)

        # 다시 연결 및 입장
        communicator, response_dict = await self.connect_and_echo_data(
            tournament_name=self.room_1_name,
            user=await self.get_user(self.room_1_owner_id),
        )
        # 남는 메세지 버리기
        await self.discard_all_message(
            communicators=self.test_tournament1_communicators
        )
        # 다시 연결 된 방 첫번째 자리에 잘 들어 갔는지 확인
        tournament = ACTIVE_TOURNAMENTS.get(self.room_1_name)
        self.assertEqual(tournament.tournament_name, self.room_1_name)
        self.assertEqual(tournament.player_list[0].get_intra_id(), self.room_1_owner_id)
        self.assertEqual(tournament.player_list[1].get_intra_id(), self.room_1_user1_id)
        self.assertEqual(tournament.player_total_cnt, 2)

        # room1에 세번째 유저 참가
        communicator, response_dict = await self.connect_and_echo_data(
            tournament_name=self.room_1_name,
            user=await self.create_test_user(
                intra_id=self.room_1_user2_id,
                nickname=self.room_1_user2_id + self.suffix,
            ),
        )

        # 남는 메세지 버리기
        await self.discard_all_message(
            communicators=self.test_tournament1_communicators
        )
        # 세번째 유저가 방에 잘 들어갔는지 확인
        tournament = ACTIVE_TOURNAMENTS.get(self.room_1_name)
        self.assertEqual(tournament.tournament_name, self.room_1_name)
        self.assertEqual(tournament.player_list[0].get_intra_id(), self.room_1_owner_id)
        self.assertEqual(tournament.player_list[1].get_intra_id(), self.room_1_user1_id)
        self.assertEqual(tournament.player_list[2].get_intra_id(), self.room_1_user2_id)
        self.assertEqual(tournament.player_total_cnt, 3)

    async def test_overflow_user_connection_test(self):
        """
        full방일때 접속 요청하면 close 되는지 확인 테스트
        """
        users_info_test_tournament1 = [
            {
                "intra_id": self.room_1_owner_id,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "intra_id": self.room_1_user1_id,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
            {
                "intra_id": self.room_1_user2_id,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
            {
                "intra_id": self.room_1_user3_id,
                "expected_player_number": PlayerNumber.PLAYER_4,
            },
        ]

        self.test_tournament1_communicators = await self.perform_test_sequence(
            self.room_1_name, users_info_test_tournament1
        )
        # 모든 메세지 버리기
        await self.discard_all_message(self.test_tournament1_communicators)

        # 새로운 유저가 full 방 참가 요청
        communicator = WebsocketCommunicator(
            application, f"/ws/tournament_game/{self.room_1_name}/"
        )
        user = await self.create_test_user(
            intra_id="other_user", nickname="other_user" + self.suffix
        )
        communicator.scope["user"] = user
        connected, _ = await communicator.connect()
        tournament = ACTIVE_TOURNAMENTS.get(self.room_1_name)
        self.assertEqual(tournament.status, TournamentStatus.READY)
        # 거부 하는지 확인
        self.assertFalse(connected)


class TournamentGameRoundConsumerTests(TestCase):
    expected_tournaments_data: list[dict[str, str]]
    TEST_TOURNAMENTS_INFO = [
        {
            "tournament_name": "한글",
            "create_user_intra_id": "room_1_owner",
            "create_user_nickname": "room_1_owner_nickname",
            "wait_num": "1",
        },
        {
            "tournament_name": "test_tournament2",
            "create_user_intra_id": "room_2_owner",
            "create_user_nickname": "room_2_owner_nickname",
            "wait_num": "1",
        },
    ]

    def __init__(self, methodName: str = ...):
        super().__init__(methodName)
        self.room_1_name = "한글"
        self.room_2_name = "test_tournament2"
        self.room_1_owner_id = "room_1_owner"
        self.room_1_user1_id = "room_1_user1"
        self.room_1_user2_id = "room_1_user2"
        self.room_1_user3_id = "room_1_user3"
        self.room_2_owner_id = "room_2_owner"
        self.room_2_user1_id = "room_2_user1"
        self.room_2_user2_id = "room_2_user2"
        self.room_2_user3_id = "room_2_user3"
        self.suffix = "_nickname"

    @database_sync_to_async
    def create_test_user(self, intra_id):
        # 테스트 사용자 생성
        return get_user_model().objects.create_user(
            intra_id=intra_id, nickname=intra_id + self.suffix
        )

    @database_sync_to_async
    def delete_test_user(self, user):
        # 테스트 사용자 삭제
        user.delete()

    @database_sync_to_async
    def get_user(self, intra_id: str):
        # 데이터베이스에서 사용자 조회
        return Users.objects.get(intra_id=intra_id)

    @database_sync_to_async
    def get_tournament_data(self, tournamnet_name: str, round: int):
        try:
            return TournamentGameLogs.objects.get(
                tournament_name=tournamnet_name, round=round
            )
        except GeneralGameLogs.DoesNotExist:
            return None

    async def wait_for_tournament_data(
        self, tournamnet_name: str, round: int, timeout=1
    ):
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                game_data = await self.get_tournament_data(
                    tournamnet_name=tournamnet_name, round=round
                )
                if game_data:
                    return game_data
            except TournamentGameLogs.DoesNotExist:
                await asyncio.sleep(0.2)
        return None

    def setUp(self):
        """
        가짜 토너먼트 데이터 준비
        """
        self.fake_tournaments = {
            tournament_info["tournament_name"]: Tournament(
                tournament_name=tournament_info["tournament_name"],
                create_user_intra_id=tournament_info["create_user_intra_id"],
                create_user_nickname=tournament_info["create_user_nickname"],
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

    async def connect_and_echo_data(self, tournament_name: str, user: Users) -> tuple:
        """
        연결하고 받은 메시지를 그대로 다시 보내는 함수
        """
        communicator = WebsocketCommunicator(
            application, f"/ws/tournament_game/{tournament_name}/"
        )
        communicator.scope["user"] = user
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        response = await communicator.receive_from()
        await communicator.send_to(response)
        response_dict = json.loads(response)
        return communicator, response_dict

    async def connect_and_send_ready_data(
        self, tournament_name: str, user: Users, round: int, ready_data: dict
    ) -> WebsocketCommunicator:
        """
        연결하고 ready_data를 send_to함
        """
        communicator = WebsocketCommunicator(
            application, f"/ws/tournament_game/{tournament_name}/{round}/"
        )
        communicator.scope["user"] = user
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.send_to(json.dumps(ready_data))
        return communicator

    async def discard_all_message(self, communicators: list):
        for idx, communicator in enumerate(communicators):
            while await communicator.receive_nothing() is False:
                message = await communicator.receive_from()

    async def perform_test_sequence(
        self, tournament_name: str, users_info: list[dict]
    ) -> list:
        """
        특정 토너먼트에 대해 사용자 생성, 연결 및 대기 메시지 확인을 수행하는 메서드.
        communicators를 반환
        """
        communicators = []
        total_num = 1
        for user_info in users_info:
            user = await self.create_test_user(intra_id=user_info["intra_id"])
            communicator, response_dict = await self.connect_and_echo_data(
                tournament_name=tournament_name, user=user
            )

            self.assertEqual(response_dict["message_type"], MessageType.WAIT.value)
            self.assertEqual(response_dict["nickname"], user.nickname)
            self.assertEqual(response_dict["total"], total_num)
            self.assertEqual(
                response_dict["number"], user_info["expected_player_number"].value
            )

            communicators.append(communicator)
            total_num += 1
        return communicators

    async def check_recieved_ready_messgae_valid(
        self, users_ready_info: list[dict], communicators: list
    ) -> None:
        """
        ready_message가 있는지, 그 값이 올바른지 확인
        """
        info_index: int = 0
        has_ready_message: bool = False
        for communicator in communicators:
            while await communicator.receive_nothing() is False:
                message = await communicator.receive_from()
                message_dict = json.loads(message)
                if message_dict["message_type"] == MessageType.READY.value:
                    self.assertEqual(
                        message_dict["round"], users_ready_info[info_index]["round"]
                    )
                    self.assertEqual(
                        message_dict["1p"], users_ready_info[info_index]["1p"]
                    )
                    self.assertEqual(
                        message_dict["2p"], users_ready_info[info_index]["2p"]
                    )
                    info_index += 1
                    has_ready_message = True
            if has_ready_message is False:
                self.assertTrue(False)

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", 300)
    async def test_round_logic_test(self):
        """
        정상적인 로직으로 진행했을때 결승전까지 잘 마무리 되는지 테스트
        """
        users_info_test_tournament1 = [
            {
                "intra_id": self.room_1_owner_id,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "intra_id": self.room_1_user1_id,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
            {
                "intra_id": self.room_1_user2_id,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
            {
                "intra_id": self.room_1_user3_id,
                "expected_player_number": PlayerNumber.PLAYER_4,
            },
        ]

        self.test_tournament1_communicators = await self.perform_test_sequence(
            self.room_1_name, users_info_test_tournament1
        )

        users_ready_info_test_tournament1 = [
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
        ]

        await self.check_recieved_ready_messgae_valid(
            users_ready_info=users_ready_info_test_tournament1,
            communicators=self.test_tournament1_communicators,
        )

        await self.discard_all_message(
            communicators=self.test_tournament1_communicators
        )

        # 접속 다 끊기
        for communicator in self.test_tournament1_communicators:
            await communicator.disconnect()

        self.test_tournament1_communicators = []
        round_list = [1, 1, 2, 2]
        for idx, (ready_info, user_info) in enumerate(
            zip(users_ready_info_test_tournament1, users_info_test_tournament1),
            start=0,
        ):
            user = await self.get_user(intra_id=user_info["intra_id"])
            communicator = await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=user,
                round=round_list[idx],
                ready_data=ready_info,
            )
            self.test_tournament1_communicators.append(communicator)

        # start 메시지 잘 받는지 확인

        start_reponse = await self.test_tournament1_communicators[0].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "1")
        self.assertEqual(start_reponse_dict["1p"], self.room_1_owner_id + self.suffix)
        self.assertEqual(start_reponse_dict["2p"], self.room_1_user1_id + self.suffix)
        start_reponse = await self.test_tournament1_communicators[1].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "1")
        self.assertEqual(start_reponse_dict["1p"], self.room_1_owner_id + self.suffix)
        self.assertEqual(start_reponse_dict["2p"], self.room_1_user1_id + self.suffix)
        start_reponse = await self.test_tournament1_communicators[2].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "2")
        self.assertEqual(start_reponse_dict["1p"], self.room_1_user2_id + self.suffix)
        self.assertEqual(start_reponse_dict["2p"], self.room_1_user3_id + self.suffix)
        start_reponse = await self.test_tournament1_communicators[3].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "2")
        self.assertEqual(start_reponse_dict["1p"], self.room_1_user2_id + self.suffix)
        self.assertEqual(start_reponse_dict["2p"], self.room_1_user3_id + self.suffix)

        await self.test_tournament1_communicators[0].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        await self.test_tournament1_communicators[2].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        while True:
            user1_response = await self.test_tournament1_communicators[0].receive_from()
            user1_dict = json.loads(user1_response)
            if (
                user1_dict["message_type"] == "end"
                or user1_dict["message_type"] == "stay"
            ):
                break

        while True:
            user2_response = await self.test_tournament1_communicators[1].receive_from()
            user2_dict = json.loads(user2_response)
            if (
                user2_dict["message_type"] == "end"
                or user2_dict["message_type"] == "stay"
            ):
                break

        while True:
            user3_response = await self.test_tournament1_communicators[2].receive_from()
            user3_dict = json.loads(user3_response)
            if (
                user3_dict["message_type"] == "end"
                or user3_dict["message_type"] == "stay"
            ):
                break

        while True:
            user4_response = await self.test_tournament1_communicators[3].receive_from()
            user4_dict = json.loads(user4_response)
            if (
                user4_dict["message_type"] == "end"
                or user4_dict["message_type"] == "stay"
            ):
                break

        await self.discard_all_message(self.test_tournament1_communicators)

        await self.test_tournament1_communicators[1].send_to(
            json.dumps(
                {
                    "message_type": "stay",
                    "round": "1",
                    "winner": "room_1_user1" + self.suffix,
                    "loser": "room_1_owner" + self.suffix,
                }
            )
        )

        await self.test_tournament1_communicators[3].send_to(
            json.dumps(
                {
                    "message_type": "stay",
                    "round": "2",
                    "winner": "room_1_user3" + self.suffix,
                    "loser": "room_1_user2" + self.suffix,
                }
            )
        )

        await self.discard_all_message(self.test_tournament1_communicators)

        # 연결 끊기
        for communicator in self.test_tournament1_communicators:
            await communicator.disconnect()

        self.test_tournament1_communicators = []
        self.test_tournament1_communicators.append(
            await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=await self.get_user(intra_id=self.room_1_user1_id),
                round=3,
                ready_data={
                    "message_type": MessageType.READY.value,
                    "round": "3",
                    "1p": self.room_1_user1_id + self.suffix,
                    "2p": self.room_1_user3_id + self.suffix,
                },
            )
        )

        self.test_tournament1_communicators.append(
            await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=await self.get_user(intra_id=self.room_1_user3_id),
                round=3,
                ready_data={
                    "message_type": MessageType.READY.value,
                    "round": "3",
                    "1p": self.room_1_user1_id + self.suffix,
                    "2p": self.room_1_user3_id + self.suffix,
                },
            )
        )

        await self.test_tournament1_communicators[0].receive_from()
        await self.test_tournament1_communicators[1].receive_from()

        await self.test_tournament1_communicators[0].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        while True:
            user2_response = await self.test_tournament1_communicators[0].receive_from()
            user2_dict = json.loads(user2_response)
            if (
                user2_dict["message_type"] == "end"
                or user2_dict["message_type"] == "stay"
            ):
                break

        while True:
            user4_response = await self.test_tournament1_communicators[1].receive_from()
            user4_dict = json.loads(user4_response)
            if (
                user4_dict["message_type"] == "end"
                or user4_dict["message_type"] == "stay"
            ):
                break

        await self.discard_all_message(self.test_tournament1_communicators)
        await self.test_tournament1_communicators[0].send_to(
            json.dumps(
                {
                    "message_type": "stay",
                    "round": "3",
                    "winner": "room_1_user3" + self.suffix,
                    "loser": "room_1_user1" + self.suffix,
                }
            )
        )

        # tournament db에 잘 저장 됐는지 확인하는 테스트
        await self.wait_for_tournament_data(tournamnet_name=self.room_1_name, round=1)
        await self.wait_for_tournament_data(tournamnet_name=self.room_1_name, round=2)
        await self.wait_for_tournament_data(tournamnet_name=self.room_1_name, round=3)

        user2_response = await self.test_tournament1_communicators[1].receive_from()
        user2_dict = json.loads(user2_response)

        self.assertEqual(user2_dict["message_type"], "complete")
        self.assertEqual(user2_dict["winner"], "room_1_user3_nickname")
        self.assertEqual(user2_dict["loser"], "room_1_user1_nickname")
        self.assertEqual(user2_dict["etc1"], "room_1_owner_nickname")
        self.assertEqual(user2_dict["etc2"], "room_1_user2_nickname")

        await self.discard_all_message(self.test_tournament1_communicators)

        # user db에 잘 저장 됐는지 확인하는 테스트
        room_1_owner = await self.get_user(self.room_1_owner_id)
        room_1_user1 = await self.get_user(self.room_1_user1_id)
        room_1_user2 = await self.get_user(self.room_1_user2_id)
        room_1_user3 = await self.get_user(self.room_1_user3_id)
        self.assertEqual(room_1_owner.win_count, 0)
        self.assertEqual(room_1_owner.lose_count, 1)

        self.assertEqual(room_1_user1.win_count, 1)
        self.assertEqual(room_1_user1.lose_count, 1)

        self.assertEqual(room_1_user2.win_count, 0)
        self.assertEqual(room_1_user2.lose_count, 1)

        self.assertEqual(room_1_user3.win_count, 2)
        self.assertEqual(room_1_user3.lose_count, 0)

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", 300)
    async def test_round_logic_test1221(self):
        """
        정상적인 로직으로 진행했을때 결승전까지 잘 마무리 되는지 테스트
        """
        users_info_test_tournament1 = [
            {
                "intra_id": self.room_1_owner_id,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "intra_id": self.room_1_user1_id,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
            {
                "intra_id": self.room_1_user2_id,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
            {
                "intra_id": self.room_1_user3_id,
                "expected_player_number": PlayerNumber.PLAYER_4,
            },
        ]
        # 1 2 2 1
        users_info_test_tournament1221 = [
            {
                "intra_id": self.room_1_owner_id,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "intra_id": self.room_1_user2_id,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
            {
                "intra_id": self.room_1_user3_id,
                "expected_player_number": PlayerNumber.PLAYER_4,
            },
            {
                "intra_id": self.room_1_user1_id,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
        ]

        self.test_tournament1_communicators = await self.perform_test_sequence(
            self.room_1_name, users_info_test_tournament1
        )

        users_ready_info_test_tournament1 = [
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
        ]
        # 1221
        users_ready_info_test_tournament1221 = [
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
        ]
        await self.check_recieved_ready_messgae_valid(
            users_ready_info=users_ready_info_test_tournament1,
            communicators=self.test_tournament1_communicators,
        )

        await self.discard_all_message(
            communicators=self.test_tournament1_communicators
        )

        # 접속 다 끊기
        for communicator in self.test_tournament1_communicators:
            await communicator.disconnect()

        self.test_tournament1_communicators = []
        round_list = [1, 2, 2, 1]
        for idx, (ready_info, user_info) in enumerate(
            zip(users_ready_info_test_tournament1221, users_info_test_tournament1221),
            start=0,
        ):
            user = await self.get_user(intra_id=user_info["intra_id"])
            communicator = await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=user,
                round=round_list[idx],
                ready_data=ready_info,
            )
            self.test_tournament1_communicators.append(communicator)

        # start 메시지 잘 받는지 확인
        start_reponse = await self.test_tournament1_communicators[0].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "1")
        start_reponse = await self.test_tournament1_communicators[1].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "2")
        start_reponse = await self.test_tournament1_communicators[2].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "2")
        start_reponse = await self.test_tournament1_communicators[3].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "1")

        await self.test_tournament1_communicators[0].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        await self.test_tournament1_communicators[2].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        while True:
            user1_response = await self.test_tournament1_communicators[0].receive_from()
            user1_dict = json.loads(user1_response)
            if (
                user1_dict["message_type"] == "end"
                or user1_dict["message_type"] == "stay"
            ):
                break

        while True:
            user2_response = await self.test_tournament1_communicators[1].receive_from()
            user2_dict = json.loads(user2_response)
            if (
                user2_dict["message_type"] == "end"
                or user2_dict["message_type"] == "stay"
            ):
                break

        while True:
            user3_response = await self.test_tournament1_communicators[2].receive_from()
            user3_dict = json.loads(user3_response)
            if (
                user3_dict["message_type"] == "end"
                or user3_dict["message_type"] == "stay"
            ):
                break

        while True:
            user4_response = await self.test_tournament1_communicators[3].receive_from()
            user4_dict = json.loads(user4_response)
            if (
                user4_dict["message_type"] == "end"
                or user4_dict["message_type"] == "stay"
            ):
                break

        await self.discard_all_message(self.test_tournament1_communicators)

        await self.test_tournament1_communicators[1].send_to(
            json.dumps(
                {
                    "message_type": "stay",
                    "round": "1",
                    "winner": "room_1_user1" + self.suffix,
                    "loser": "room_1_owner" + self.suffix,
                }
            )
        )

        await self.test_tournament1_communicators[3].send_to(
            json.dumps(
                {
                    "message_type": "stay",
                    "round": "2",
                    "winner": "room_1_user3" + self.suffix,
                    "loser": "room_1_user2" + self.suffix,
                }
            )
        )

        await self.discard_all_message(self.test_tournament1_communicators)

        # 연결 끊기
        for communicator in self.test_tournament1_communicators:
            await communicator.disconnect()

        self.test_tournament1_communicators = []
        self.test_tournament1_communicators.append(
            await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=await self.get_user(intra_id=self.room_1_user1_id),
                round=3,
                ready_data={
                    "message_type": MessageType.READY.value,
                    "round": "3",
                    "1p": self.room_1_user1_id + self.suffix,
                    "2p": self.room_1_user3_id + self.suffix,
                },
            )
        )

        self.test_tournament1_communicators.append(
            await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=await self.get_user(intra_id=self.room_1_user3_id),
                round=3,
                ready_data={
                    "message_type": MessageType.READY.value,
                    "round": "3",
                    "1p": self.room_1_user1_id + self.suffix,
                    "2p": self.room_1_user3_id + self.suffix,
                },
            )
        )

        await self.test_tournament1_communicators[0].receive_from()
        await self.test_tournament1_communicators[1].receive_from()

        await self.test_tournament1_communicators[0].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        while True:
            user2_response = await self.test_tournament1_communicators[0].receive_from()
            user2_dict = json.loads(user2_response)
            if (
                user2_dict["message_type"] == "end"
                or user2_dict["message_type"] == "stay"
            ):
                break

        while True:
            user4_response = await self.test_tournament1_communicators[1].receive_from()
            user4_dict = json.loads(user4_response)
            if (
                user4_dict["message_type"] == "end"
                or user4_dict["message_type"] == "stay"
            ):
                break

        await self.discard_all_message(self.test_tournament1_communicators)
        await self.test_tournament1_communicators[0].send_to(
            json.dumps(
                {
                    "message_type": "stay",
                    "round": "3",
                    "winner": "room_1_user3" + self.suffix,
                    "loser": "room_1_user1" + self.suffix,
                }
            )
        )

        # tournament db에 잘 저장 됐는지 확인하는 테스트
        await self.wait_for_tournament_data(tournamnet_name=self.room_1_name, round=1)
        await self.wait_for_tournament_data(tournamnet_name=self.room_1_name, round=2)
        await self.wait_for_tournament_data(tournamnet_name=self.room_1_name, round=3)
        await self.discard_all_message(self.test_tournament1_communicators)

        # user db에 잘 저장 됐는지 확인하는 테스트
        room_1_owner = await self.get_user(self.room_1_owner_id)
        room_1_user1 = await self.get_user(self.room_1_user1_id)
        room_1_user2 = await self.get_user(self.room_1_user2_id)
        room_1_user3 = await self.get_user(self.room_1_user3_id)
        self.assertEqual(room_1_owner.win_count, 0)
        self.assertEqual(room_1_owner.lose_count, 1)

        self.assertEqual(room_1_user1.win_count, 1)
        self.assertEqual(room_1_user1.lose_count, 1)

        self.assertEqual(room_1_user2.win_count, 0)
        self.assertEqual(room_1_user2.lose_count, 1)

        self.assertEqual(room_1_user3.win_count, 2)
        self.assertEqual(room_1_user3.lose_count, 0)

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", 300)
    async def test_disconnect(self):
        """
        1라운드 도중에 disconnect 됐을때
        """
        users_info_test_tournament1 = [
            {
                "intra_id": self.room_1_owner_id,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "intra_id": self.room_1_user1_id,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
            {
                "intra_id": self.room_1_user2_id,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
            {
                "intra_id": self.room_1_user3_id,
                "expected_player_number": PlayerNumber.PLAYER_4,
            },
        ]

        self.test_tournament1_communicators = await self.perform_test_sequence(
            self.room_1_name, users_info_test_tournament1
        )

        users_ready_info_test_tournament1 = [
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
        ]

        await self.check_recieved_ready_messgae_valid(
            users_ready_info=users_ready_info_test_tournament1,
            communicators=self.test_tournament1_communicators,
        )

        await self.discard_all_message(
            communicators=self.test_tournament1_communicators
        )

        # 접속 다 끊기
        for communicator in self.test_tournament1_communicators:
            await communicator.disconnect()

        self.test_tournament1_communicators = []
        round_list = [1, 1, 2, 2]
        for idx, (ready_info, user_info) in enumerate(
            zip(users_ready_info_test_tournament1, users_info_test_tournament1),
            start=0,
        ):
            user = await self.get_user(intra_id=user_info["intra_id"])
            communicator = await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=user,
                round=round_list[idx],
                ready_data=ready_info,
            )
            self.test_tournament1_communicators.append(communicator)

        # start 메시지 잘 받는지 확인

        start_reponse = await self.test_tournament1_communicators[0].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "1")
        self.assertEqual(start_reponse_dict["1p"], self.room_1_owner_id + self.suffix)
        self.assertEqual(start_reponse_dict["2p"], self.room_1_user1_id + self.suffix)
        start_reponse = await self.test_tournament1_communicators[1].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "1")
        self.assertEqual(start_reponse_dict["1p"], self.room_1_owner_id + self.suffix)
        self.assertEqual(start_reponse_dict["2p"], self.room_1_user1_id + self.suffix)
        start_reponse = await self.test_tournament1_communicators[2].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "2")
        self.assertEqual(start_reponse_dict["1p"], self.room_1_user2_id + self.suffix)
        self.assertEqual(start_reponse_dict["2p"], self.room_1_user3_id + self.suffix)
        start_reponse = await self.test_tournament1_communicators[3].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "2")
        self.assertEqual(start_reponse_dict["1p"], self.room_1_user2_id + self.suffix)
        self.assertEqual(start_reponse_dict["2p"], self.room_1_user3_id + self.suffix)

        await self.test_tournament1_communicators[0].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        await self.test_tournament1_communicators[2].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        # 1점내고 게임 나가기
        while True:
            user1_response = await self.test_tournament1_communicators[0].receive_from()
            user1_dict = json.loads(user1_response)
            if user1_dict["message_type"] == "score":
                await self.test_tournament1_communicators[0].disconnect()
                break

        count = 0
        for idx, communicator in enumerate(self.test_tournament1_communicators):
            while await communicator.receive_nothing() is False:
                message = await communicator.receive_from()
                message_dict = json.loads(message)
                if message_dict["message_type"] == "error":
                    count += 1
                if (
                    message_dict["message_type"] == "stay"
                    or message_dict["message_type"] == "end"
                ):
                    self.assertTrue(False)

        self.assertEqual(count, 3)

    @patch("pong_game.module.GameSetValue.BALL_SPEED_Z", 300)
    async def test_disconnect2(self):
        """
        마지막 라운드일때 나가기
        """
        users_info_test_tournament1 = [
            {
                "intra_id": self.room_1_owner_id,
                "expected_player_number": PlayerNumber.PLAYER_1,
            },
            {
                "intra_id": self.room_1_user1_id,
                "expected_player_number": PlayerNumber.PLAYER_2,
            },
            {
                "intra_id": self.room_1_user2_id,
                "expected_player_number": PlayerNumber.PLAYER_3,
            },
            {
                "intra_id": self.room_1_user3_id,
                "expected_player_number": PlayerNumber.PLAYER_4,
            },
        ]

        self.test_tournament1_communicators = await self.perform_test_sequence(
            self.room_1_name, users_info_test_tournament1
        )

        users_ready_info_test_tournament1 = [
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "1",
                "1p": self.room_1_owner_id + self.suffix,
                "2p": self.room_1_user1_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
            {
                "message_type": MessageType.READY.value,
                "round": "2",
                "1p": self.room_1_user2_id + self.suffix,
                "2p": self.room_1_user3_id + self.suffix,
            },
        ]

        await self.check_recieved_ready_messgae_valid(
            users_ready_info=users_ready_info_test_tournament1,
            communicators=self.test_tournament1_communicators,
        )

        await self.discard_all_message(
            communicators=self.test_tournament1_communicators
        )

        # 접속 다 끊기
        for communicator in self.test_tournament1_communicators:
            await communicator.disconnect()

        self.test_tournament1_communicators = []
        round_list = [1, 1, 2, 2]
        for idx, (ready_info, user_info) in enumerate(
            zip(users_ready_info_test_tournament1, users_info_test_tournament1),
            start=0,
        ):
            user = await self.get_user(intra_id=user_info["intra_id"])
            communicator = await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=user,
                round=round_list[idx],
                ready_data=ready_info,
            )
            self.test_tournament1_communicators.append(communicator)

        # start 메시지 잘 받는지 확인

        start_reponse = await self.test_tournament1_communicators[0].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "1")
        start_reponse = await self.test_tournament1_communicators[1].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "1")
        start_reponse = await self.test_tournament1_communicators[2].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "2")
        start_reponse = await self.test_tournament1_communicators[3].receive_from()
        start_reponse_dict = json.loads(start_reponse)
        self.assertEqual(start_reponse_dict["message_type"], MessageType.START.value)
        self.assertEqual(start_reponse_dict["round"], "2")

        await self.test_tournament1_communicators[0].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        await self.test_tournament1_communicators[2].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        while True:
            user1_response = await self.test_tournament1_communicators[0].receive_from()
            user1_dict = json.loads(user1_response)
            if (
                user1_dict["message_type"] == "end"
                or user1_dict["message_type"] == "stay"
            ):
                break

        while True:
            user2_response = await self.test_tournament1_communicators[1].receive_from()
            user2_dict = json.loads(user2_response)
            if (
                user2_dict["message_type"] == "end"
                or user2_dict["message_type"] == "stay"
            ):
                break

        while True:
            user3_response = await self.test_tournament1_communicators[2].receive_from()
            user3_dict = json.loads(user3_response)
            if (
                user3_dict["message_type"] == "end"
                or user3_dict["message_type"] == "stay"
            ):
                break

        while True:
            user4_response = await self.test_tournament1_communicators[3].receive_from()
            user4_dict = json.loads(user4_response)
            if (
                user4_dict["message_type"] == "end"
                or user4_dict["message_type"] == "stay"
            ):
                break

        await self.discard_all_message(self.test_tournament1_communicators)

        await self.test_tournament1_communicators[1].send_to(
            json.dumps(
                {
                    "message_type": "stay",
                    "round": "1",
                    "winner": "room_1_user1" + self.suffix,
                    "loser": "room_1_owner" + self.suffix,
                }
            )
        )

        await self.test_tournament1_communicators[3].send_to(
            json.dumps(
                {
                    "message_type": "stay",
                    "round": "2",
                    "winner": "room_1_user3" + self.suffix,
                    "loser": "room_1_user2" + self.suffix,
                }
            )
        )

        await self.discard_all_message(self.test_tournament1_communicators)

        # 연결 끊기
        for communicator in self.test_tournament1_communicators:
            await communicator.disconnect()

        self.test_tournament1_communicators = []
        self.test_tournament1_communicators.append(
            await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=await self.get_user(intra_id=self.room_1_user1_id),
                round=3,
                ready_data={
                    "message_type": MessageType.READY.value,
                    "round": "3",
                    "1p": self.room_1_user1_id + self.suffix,
                    "2p": self.room_1_user3_id + self.suffix,
                },
            )
        )

        self.test_tournament1_communicators.append(
            await self.connect_and_send_ready_data(
                tournament_name=self.room_1_name,
                user=await self.get_user(intra_id=self.room_1_user3_id),
                round=3,
                ready_data={
                    "message_type": MessageType.READY.value,
                    "round": "3",
                    "1p": self.room_1_user1_id + self.suffix,
                    "2p": self.room_1_user3_id + self.suffix,
                },
            )
        )

        await self.test_tournament1_communicators[0].receive_from()
        await self.test_tournament1_communicators[1].receive_from()

        await self.test_tournament1_communicators[0].send_to(
            text_data=json.dumps(
                {"message_type": "playing", "number": "player1", "input": "left_press"}
            )
        )

        # 1점 내고 나가기
        while True:
            user2_response = await self.test_tournament1_communicators[0].receive_from()
            user2_dict = json.loads(user2_response)
            if user2_dict["message_type"] == "score":
                await self.test_tournament1_communicators[1].disconnect()
                break

        count = 0
        for idx, communicator in enumerate(self.test_tournament1_communicators):
            while await communicator.receive_nothing() is False:
                message = await communicator.receive_from()
                message_dict = json.loads(message)
                if message_dict["message_type"] == "error":
                    count += 1
                if (
                    message_dict["message_type"] == "stay"
                    or message_dict["message_type"] == "end"
                ):
                    self.assertTrue(False)

        self.assertEqual(count, 1)
