import asyncio
import json
import uuid
from typing import Deque
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from accounts.models import Users, UserStatusEnum
from collections import deque
from .module.Game import GeneralGame
from .module.GameSetValue import (
    MAX_SCORE,
    PlayerStatus,
    GameTimeType,
    ResultType,
    NOT_ALLOWED_TOURNAMENT_NAME,
)
from .module.GameSetValue import MessageType
from games.serializers import GeneralGameLogsSerializer
from rest_framework.exceptions import ValidationError
from .module.Player import Player
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
            if self.game_id in ACTIVE_GENERAL_GAMES.keys():
                ACTIVE_GENERAL_GAMES.pop(self.game_id)
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

        await self.send(
            json.dumps({"message_type": MessageType.CREATE.value, "result": result})
        )
