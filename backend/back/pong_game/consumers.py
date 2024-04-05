import asyncio
import json
import uuid
from typing import Deque
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from accounts.models import Users, UserStatusEnum
from collections import deque
from .module.GeneralGame import GeneralGame
from .module.GameSetValue import (
    MessageType,
    MAX_SCORE,
    PlayerStatus,
    GameTimeType,
    ResultType,
    NOT_ALLOWED_TOURNAMENT_NAME,
    TournamentStatus,
    TOURNAMENT_PLAYER_MAX_CNT,
    TournamentGroupName,
)
from games.serializers import GeneralGameLogsSerializer, TournamentGameLogsSerializer
from rest_framework.exceptions import ValidationError
from .module.Player import Player
from .module.Round import Round
from .module.Tournament import Tournament
from games.models import TournamentGameLogs

ACTIVE_GENERAL_GAMES: dict[str, GeneralGame] = {}
ACTIVE_TOURNAMENTS: dict[str, Tournament] = {}


class LoginConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user: Users or None = None

    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            await self.accept()
            await self.update_user_status(UserStatusEnum.ONLINE)
        else:
            await self.close()

    async def disconnect(self, close_code) -> None:
        if self.user.is_authenticated:
            await self.update_user_status(UserStatusEnum.OFFLINE)

    @database_sync_to_async
    def update_user_status(self, status: UserStatusEnum) -> None:
        Users.objects.filter(user_id=self.user.user_id).update(status=status)


class GeneralGameWaitConsumer(AsyncWebsocketConsumer):
    intra_id_list: list[str] = list()
    wait_list: Deque["GeneralGameWaitConsumer"] = deque()

    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user: Users or None = None

    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated and await self.add_wait_list():
            await self.accept()
            if len(GeneralGameWaitConsumer.wait_list) > 1:
                await GeneralGameWaitConsumer.game_match()
        else:
            await self.close()

    async def disconnect(self, close_code) -> None:
        if self.user.is_authenticated:
            if (
                self in GeneralGameWaitConsumer.wait_list
                and self.user.intra_id in GeneralGameWaitConsumer.intra_id_list
            ):
                GeneralGameWaitConsumer.intra_id_list.remove(self.user.intra_id)
                GeneralGameWaitConsumer.wait_list.remove(self)

    @classmethod
    async def game_match(cls) -> None:
        game_id = str(uuid.uuid4())
        player1 = GeneralGameWaitConsumer.wait_list.popleft()
        player2 = GeneralGameWaitConsumer.wait_list.popleft()
        await player1.send(json.dumps({"game_id": game_id}))
        await player2.send(json.dumps({"game_id": game_id}))
        GeneralGameWaitConsumer.intra_id_list.remove(player1.user.intra_id)
        GeneralGameWaitConsumer.intra_id_list.remove(player2.user.intra_id)
        ACTIVE_GENERAL_GAMES[game_id] = GeneralGame(
            Player(1, player1.user.intra_id), Player(2, player2.user.intra_id)
        )

    async def add_wait_list(self) -> bool:
        if self.user.intra_id in GeneralGameWaitConsumer.intra_id_list:
            return False
        GeneralGameWaitConsumer.wait_list.append(self)
        GeneralGameWaitConsumer.intra_id_list.append(self.user.intra_id)
        return True


class GeneralGameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user: Users = None
        self.game_id: str | None = None
        self.game_group_name: str | None = None
        self.game_loop_task: asyncio.Task | None = None

    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            self.game_id = str(self.scope["url_route"]["kwargs"]["game_id"])
            if (
                self.game_id not in ACTIVE_GENERAL_GAMES.keys()
                or ACTIVE_GENERAL_GAMES[self.game_id].get_status() != PlayerStatus.WAIT
                or ACTIVE_GENERAL_GAMES[self.game_id].get_player(self.user.intra_id)
                is None
            ):
                await self.close()
                return
            game = ACTIVE_GENERAL_GAMES[self.game_id]
            player, number = game.get_player(self.user.intra_id)
            self.game_group_name = f"game_{self.game_id}"
            await self.channel_layer.group_add(self.game_group_name, self.channel_name)
            await self.accept()
            await self.send(GeneralGame.build_ready_json(number, player.intra_id))
        else:
            await self.close()

    async def disconnect(self, close_code) -> None:
        if self.user.is_authenticated:
            game = ACTIVE_GENERAL_GAMES.get(self.game_id)
            if game:
                ACTIVE_GENERAL_GAMES.pop(self.game_id)
                if game.get_status() != PlayerStatus.END:  # 게임 중간에 나갔을 경우
                    data = game.build_error_json(self.user.intra_id)
                    await self.channel_layer.group_send(
                        self.game_group_name, {"type": "game.message", "message": data}
                    )
                self.game_loop_task.cancel()
                try:  # cancel() 동작이 끝날 때까지 대기
                    await self.game_loop_task
                except asyncio.CancelledError:
                    pass  # task가 이미 취소된 경우
            await self.channel_layer.group_discard(
                self.game_group_name, self.channel_name
            )

    async def game_message(self, event) -> None:
        message = event["message"]

        # Send message to WebSocket
        await self.send(text_data=message)

    async def receive(self, text_data: json = None, bytes_data=None) -> None:
        data = json.loads(text_data)
        game = ACTIVE_GENERAL_GAMES[self.game_id]
        if (
            data["message_type"] == MessageType.READY.value
            and game.get_status() == PlayerStatus.WAIT
        ):
            game.set_ready(data["number"])
            if game.is_all_ready():
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        "type": "game.message",
                        "message": game.build_start_json(),
                    },
                )
                game.set_status(PlayerStatus.PLAYING)
                game.set_game_time(GameTimeType.START_TIME.value)
                self.game_loop_task = asyncio.create_task(
                    self.send_game_messages_loop(game)
                )
        elif (
            data["message_type"] == MessageType.PLAYING.value
            and game.get_status() == PlayerStatus.PLAYING
        ):
            game.key_input(text_data)
        elif (
            data["message_type"] == MessageType.END.value
            and game.get_status() == PlayerStatus.END
        ):
            try:
                await self.save_game_data_to_db(game.get_db_data())
                await self.send(
                    json.dumps(
                        {
                            "message_type": MessageType.COMPLETE.value,
                        }
                    )
                )
            except ValidationError:
                await self.send(
                    json.dumps(
                        {
                            "message_type": MessageType.ERROR.value,
                        }
                    )
                )

    async def send_game_messages_loop(self, game: GeneralGame) -> None:
        while True:
            await asyncio.sleep(1 / 30)
            if game.get_status() == PlayerStatus.PLAYING:
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {"type": "game.message", "message": game.build_game_json()},
                )
            elif game.get_status() == PlayerStatus.SCORE:
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {"type": "game.message", "message": game.build_score_json()},
                )
                score1, score2 = game.get_score()
                if score1 == MAX_SCORE or score2 == MAX_SCORE:
                    await self.channel_layer.group_send(
                        self.game_group_name,
                        {"type": "game.message", "message": game.build_end_json()},
                    )
                    game.set_status(PlayerStatus.END)
                    game.set_game_time(GameTimeType.END_TIME.value)
                    break
                game.set_status(PlayerStatus.PLAYING)

    @database_sync_to_async
    def save_game_data_to_db(self, game_data: dict) -> None:
        serializer = GeneralGameLogsSerializer(data=game_data)
        # raise_exception=True 에러 발생시 예외처리 해야함
        if serializer.is_valid(raise_exception=True):
            serializer.save()


class TournamentGameWaitConsumer(AsyncWebsocketConsumer):
    queryset = TournamentGameLogs.objects.all()

    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user: Users or None = None
        self.isProcessingComplete: bool = False

    @database_sync_to_async
    def is_exist_game_data_in_db(self, tournament_name: str) -> bool:
        if self.queryset.filter(tournament_name=tournament_name):
            return True
        return False

    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            await self.accept()
            await self.send(
                json.dumps(
                    {
                        "game_list": [
                            t.build_tournament_wait_dict()
                            for t in ACTIVE_TOURNAMENTS.values()
                        ]
                    }
                )
            )
        else:
            await self.close()

    async def receive(self, text_data: json = None, bytes_data=None) -> None:
        if self.isProcessingComplete:
            return

        data = json.loads(text_data)
        if data.get("message_type") != MessageType.CREATE.value:
            return

        tournament_name = data.get("tournament_name")
        if await self.is_exist_game_data_in_db(tournament_name=tournament_name):
            result = ResultType.FAIL.value
        elif tournament_name is None:
            result = ResultType.FAIL.value
        elif tournament_name == NOT_ALLOWED_TOURNAMENT_NAME:
            result = ResultType.FAIL.value
        elif tournament_name in ACTIVE_TOURNAMENTS.keys():
            result = ResultType.FAIL.value
        else:
            result = ResultType.SUCCESS.value
            self.isProcessingComplete = True
            # TODO test 필요
            ACTIVE_TOURNAMENTS[tournament_name] = Tournament(
                tournament_name=tournament_name, create_user_intra_id=self.user.intra_id
            )

        await self.send(
            json.dumps({"message_type": MessageType.CREATE.value, "result": result})
        )


class TournamentGameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user: Users or None = None
        self.tournament_name: str = ""
        self.group_name_prefix: str = ""
        self.group_name_a: str = ""
        self.group_name_b: str = ""
        self.tournament: Tournament or None = None

    async def send_message(self, event) -> None:
        message = event["message"]

        # Send message to WebSocket
        await self.send(text_data=message)

    # TODO accept 위치 테스트 터지면 보기
    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            self.tournament_name: str = self.scope["url_route"]["kwargs"][
                "tournament_name"
            ]
            self.group_name_prefix = f"tournament_{self.tournament_name}"
            self.group_name_a = self.group_name_prefix + "a"
            self.group_name_b = self.group_name_prefix + "b"
            self.tournament = ACTIVE_TOURNAMENTS.get(self.tournament_name)
        if (
            self.tournament is not None
            and self.tournament.get_status() == TournamentStatus.WAIT
        ):
            await self.accept()
            player_number, wait_detail_json = (
                self.tournament.build_tournament_wait_detail_json(
                    intra_id=self.user.intra_id
                )
            )
            if int(player_number[-1]) <= TOURNAMENT_PLAYER_MAX_CNT // 2:
                await self.channel_layer.group_add(self.group_name_a, self.channel_name)
            else:
                await self.channel_layer.group_add(self.group_name_b, self.channel_name)

            await self.channel_layer.group_send(
                self.group_name_a,
                {"type": "send.message", "message": wait_detail_json},
            )
            await self.channel_layer.group_send(
                self.group_name_b,
                {"type": "send.message", "message": wait_detail_json},
            )
        else:
            await self.close()

    async def disconnect(self, close_code) -> None:
        if not self.user.is_authenticated:
            return

        if self.tournament.get_status() == TournamentStatus.READY:
            return

        self.tournament.disconnect_tournament(self.user.intra_id)
        if self.tournament.get_player_total_cnt() == 0:
            ACTIVE_TOURNAMENTS.pop(self.tournament_name)

    async def receive(self, text_data: json = None, bytes_data=None) -> None:
        data = json.loads(text_data)
        if data.get("message_type") == MessageType.WAIT.value:
            number = data.get("number")
            intra_id = data.get("intra_id")
            if intra_id != self.user.intra_id:
                return

            if not self.tournament.try_set_ready(
                player_number=number, intra_id=intra_id
            ):
                return

            if self.tournament.is_all_ready():
                await self.channel_layer.group_send(
                    self.group_name_a,
                    {
                        "type": "send.message",
                        "message": self.tournament.build_tournament_ready_json(
                            TournamentGroupName.A_TEAM
                        ),
                    },
                )
                await self.channel_layer.group_send(
                    self.group_name_b,
                    {
                        "type": "send.message",
                        "message": self.tournament.build_tournament_ready_json(
                            TournamentGroupName.B_TEAM
                        ),
                    },
                )


class TournamentGameRoundConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user: Users or None = None
        self.tournament_name: str = ""  # 토너먼트 이름
        self.tournament: Tournament or None = None  # 현재 토너먼트 객체
        self.round_number: int = 0  # 현재 라운드
        self.round: Round or None = None  # 현재 라운드 객체
        self.game_group_name: str = ""  # 현재 게임 그룹 채널 이름
        self.tournament_broadcast: str = ""  # 현재 토너먼트 전체 채널 이름
        self.winner_group: str = ""  # 1,2라운드 승자 채널 이름
        self.game_loop_task: asyncio.Task | None = None  # 게임 루프

    async def game_message(self, event) -> None:
        message = event["message"]

        # Send message to WebSocket
        await self.send(text_data=message)

    async def diff_game_message(self, event) -> None:
        stay_message = event["stay_message"]
        end_message = event["end_message"]

        # Send message to WebSocket
        if self.user.intra_id == self.round.get_winner():
            await self.send(text_data=stay_message)
        else:
            await self.send(text_data=end_message)

    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            self.tournament_name = self.scope["url_route"]["kwargs"]["tournament_name"]
            self.tournament = ACTIVE_TOURNAMENTS.get(self.tournament_name)
            self.round_number = int(self.scope["url_route"]["kwargs"]["round"])
            self.round = self.tournament.get_round(self.round_number)
            self.game_group_name = self.tournament_name + "_" + str(self.round_number)
            self.tournament_broadcast = self.tournament_name + "_broadcast"
            if (
                self.tournament is not None
                and self.tournament.get_status() == TournamentStatus.READY
                and self.round is not None
                and self.round.get_player(self.user.intra_id) is not None
            ):
                await self.accept()
                await self.channel_layer.group_add(
                    self.tournament_broadcast, self.channel_name
                )
                await self.channel_layer.group_add(
                    self.game_group_name, self.channel_name
                )
        else:
            await self.close()

    async def disconnect(self, code) -> None:
        if not self.user.is_authenticated:
            return

        # 게임이 비정상 종료 되었을 때
        if self.round.get_status() != PlayerStatus.END:
            self.tournament.set_status(TournamentStatus.END)
            data = self.round.build_error_json(self.user.intra_id)
            await self.channel_layer.group_send(
                self.tournament_broadcast,
                {"type": "game.message", "message": data},
            )

        # 각 라운드의 loop가 아직 취소되지 않은 경우
        if not self.round.get_is_closed():
            self.round.set_is_closed(True)
            # 토너먼트가 종료되었을 때
            if (
                self.tournament.get_status() == TournamentStatus.END
                and self.tournament_name in ACTIVE_TOURNAMENTS.keys()
            ):
                ACTIVE_TOURNAMENTS.pop(self.tournament_name)
            self.game_loop_task.cancel()
            try:  # cancel() 동작이 끝날 때까지 대기
                await self.game_loop_task
            except asyncio.CancelledError:
                pass  # task가 이미 취소된 경우
        await self.channel_layer.group_discard(
            self.tournament_broadcast, self.channel_name
        )
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)
        # 승자 그룹이 지정되어 채널에 들어가 있을 때
        if self.winner_group:
            await self.channel_layer.group_discard(self.winner_group, self.channel_name)

    async def receive(self, text_data: json = None, bytes_data=None) -> None:
        data = json.loads(text_data)
        message_type = data.get("message_type")
        if (
            message_type == MessageType.READY.value
            and self.tournament.get_status() == TournamentStatus.READY
        ):
            self.round.set_ready(self.user.intra_id)
            if self.round.is_all_ready():
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {
                        "type": "game.message",
                        "message": self.round.build_start_json(),
                    },
                )
                self.round.set_status(PlayerStatus.PLAYING)
                self.tournament.set_status(TournamentStatus.PLAYING)
                self.round.set_game_time(GameTimeType.START_TIME.value)
                self.game_loop_task = asyncio.create_task(
                    self.send_game_messages_loop(self.round)
                )
        elif (
            data["message_type"] == MessageType.PLAYING.value
            and self.round.get_status() == PlayerStatus.PLAYING
        ):
            self.round.key_input(text_data)
        elif (
            data["message_type"] == MessageType.STAY.value
            and self.round.get_status() == PlayerStatus.END
        ):
            await self.next_match()

    async def send_game_messages_loop(self, game: Round) -> None:
        while True:
            await asyncio.sleep(1 / 30)
            if game.get_status() == PlayerStatus.PLAYING:
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {"type": "game.message", "message": game.build_game_json()},
                )
            elif game.get_status() == PlayerStatus.SCORE:
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {"type": "game.message", "message": game.build_score_json()},
                )
                score1, score2 = game.get_score()
                if score1 == MAX_SCORE or score2 == MAX_SCORE:
                    await self.channel_layer.group_send(
                        self.game_group_name,
                        {
                            "type": "diff.game.message",
                            "end_message": game.build_end_json(),
                            "stay_message": game.build_stay_json(),
                        },
                    )
                    game.set_status(PlayerStatus.END)
                    game.set_game_time(GameTimeType.END_TIME.value)
                    break
                game.set_status(PlayerStatus.PLAYING)

    async def next_match(self) -> None:
        if self.round_number == 3:
            self.tournament.set_status(TournamentStatus.END)
            try:
                self.save_game_data_to_db()
                await self.channel_layer.group_send(
                    self.tournament_broadcast,
                    json.dumps(
                        {
                            "message_type": MessageType.COMPLETE.value,
                        }
                    ),
                )
            except ValidationError:
                await self.channel_layer.group_send(
                    self.tournament_broadcast,
                    json.dumps(
                        {
                            "message_type": MessageType.ERROR.value,
                        }
                    ),
                )
        else:
            round1, round2 = self.tournament.get_round(1), self.tournament.get_round(2)
            self.winner_group = self.tournament_name + "_winner"
            self.channel_layer.group_add(self.winner_group, self.channel_name)
            if (
                round1.get_status() == PlayerStatus.END
                and round2.get_status() == PlayerStatus.END
            ):
                self.channel_layer.group_send(
                    self.winner_group,
                    {
                        "type": "game.message",
                        "message": self.tournament.build_tournament_ready_json(
                            TournamentGroupName.FINAL_TEAM,
                            round1.get_winner(),
                            round2.get_winner(),
                        ),
                    },
                )

    @database_sync_to_async
    def save_game_data_to_db(self) -> None:
        for i in range(1, 4):
            round_i = self.tournament.get_round(i)
            serializer = TournamentGameLogsSerializer(data=round_i.get_db_data())
            if serializer.is_valid(raise_exception=True):
                serializer.save()
