import asyncio
import hashlib
import json
import uuid
from typing import Deque
from django.db.models import F
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from accounts.models import Users, UserStatusEnum
from collections import deque
from .module.GeneralGame import GeneralGame
from .module.GameSetValue import (
    MessageType,
    MAX_SCORE,
    GameTimeType,
    ResultType,
    NOT_ALLOWED_TOURNAMENT_NAME,
    TournamentStatus,
    TOURNAMENT_PLAYER_MAX_CNT,
    TournamentGroupName,
    GameStatus,
    RoundNumber,
    MAX_TOURNAMENT_NAME_LENGTH,
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
    nickname_list: list[str] = list()
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
        msg = "---------------------------------------\n"
        if self.user.is_authenticated:
            msg += f"{self.user.nickname}: General Wait disconnect\n"
            msg += f"wait list: {GeneralGameWaitConsumer.wait_list}\n"
            msg += f"nickname list: {GeneralGameWaitConsumer.nickname_list}\n"
            if (
                self in GeneralGameWaitConsumer.wait_list
                and self.user.nickname in GeneralGameWaitConsumer.nickname_list
            ):
                msg += f"{self.user.nickname}: remove in wait_list\n"
                GeneralGameWaitConsumer.nickname_list.remove(self.user.nickname)
                GeneralGameWaitConsumer.wait_list.remove(self)
            msg += f"{self.user.nickname}: General Wait disconnect end\n"
        msg += "---------------------------------------\n"
        print(msg)

    @classmethod
    async def game_match(cls) -> None:
        game_id = str(uuid.uuid4())
        player1 = GeneralGameWaitConsumer.wait_list.popleft()
        player2 = GeneralGameWaitConsumer.wait_list.popleft()
        await player1.send(json.dumps({"game_id": game_id}))
        await player2.send(json.dumps({"game_id": game_id}))
        GeneralGameWaitConsumer.nickname_list.remove(player1.user.nickname)
        GeneralGameWaitConsumer.nickname_list.remove(player2.user.nickname)
        ACTIVE_GENERAL_GAMES[game_id] = GeneralGame(
            Player(1, player1.user.intra_id, player1.user.nickname),
            Player(2, player2.user.intra_id, player2.user.nickname),
        )

    async def add_wait_list(self) -> bool:
        if self.user.nickname in GeneralGameWaitConsumer.nickname_list:
            return False
        GeneralGameWaitConsumer.wait_list.append(self)
        GeneralGameWaitConsumer.nickname_list.append(self.user.nickname)
        return True


class GeneralGameConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(args, kwargs)
        self.user: Users = None
        self.db_complete: bool = False
        self.game_id: str | None = None
        self.game_group_name: str | None = None
        self.game_loop_task: asyncio.Task | None = None

    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            self.game_id = str(self.scope["url_route"]["kwargs"]["game_id"])
            if (
                self.game_id not in ACTIVE_GENERAL_GAMES.keys()
                or ACTIVE_GENERAL_GAMES[self.game_id].get_status() != GameStatus.WAIT
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
            await self.send(GeneralGame.build_ready_json(number, player.nickname))
        else:
            await self.close()

    async def disconnect(self, close_code) -> None:
        msg = "---------------------------------------\n"
        if self.user.is_authenticated:
            msg += f"{self.user.nickname}: General game disconnect\n"
            game = ACTIVE_GENERAL_GAMES.get(self.game_id)
            if game:
                ACTIVE_GENERAL_GAMES.pop(self.game_id)
                msg += f"{self.user.nickname}: {self.game_id} pop\n"
                if game.get_status() != GameStatus.END:  # 게임 중간에 나갔을 경우
                    msg += f"{self.user.nickname}: 비정상 종료\n"
                    game.set_status(GameStatus.ERROR)
                    data = game.build_error_json(self.user.nickname)
                    await self.channel_layer.group_send(
                        self.game_group_name, {"type": "game.message", "message": data}
                    )
                try:  # cancel() 동작이 끝날 때까지 대기
                    self.game_loop_task.cancel()
                    await self.game_loop_task
                except:
                    pass  # task가 이미 취소된 경우
            await self.channel_layer.group_discard(
                self.game_group_name, self.channel_name
            )
        msg += f"{self.user.nickname}: disconnect end]\n"
        msg += "---------------------------------------\n"
        print(msg)

    async def game_message(self, event) -> None:
        message = event["message"]

        # Send message to WebSocket
        await self.send(text_data=message)

    async def receive(self, text_data: json = None, bytes_data=None) -> None:
        data = json.loads(text_data)
        game = ACTIVE_GENERAL_GAMES.get(self.game_id)
        if not game:
            msg = f"--------------------------------------------\n"
            msg += f"{self.user.nickname}: game is None\n"
            msg += f"data: {data}\n"
            msg += f"--------------------------------------------\n"
            print(msg)
            return
        if (
            data["message_type"] == MessageType.READY.value
            and game.get_status() == GameStatus.WAIT
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
                game.set_status(GameStatus.PLAYING)
                game.set_game_time(GameTimeType.START_TIME.value)
                self.game_loop_task = asyncio.create_task(
                    self.send_game_messages_loop(game)
                )
        elif (
            data["message_type"] == MessageType.PLAYING.value
            and game.get_status() == GameStatus.PLAYING
        ):
            game.key_input(text_data)
        elif (
            data["message_type"] == MessageType.END.value
            and game.get_status() == GameStatus.END
            and self.db_complete is False
        ):
            try:
                winner_id, loser_id = game.get_winner_loser_intra_id()
                if self.user.intra_id == winner_id:
                    await self.save_game_user_data_to_db(
                        game.get_db_data(), winner_id, loser_id
                    )
                    self.db_complete = True
                    await self.channel_layer.group_send(
                        self.game_group_name,
                        {
                            "type": "game.message",
                            "message": game.build_complete_json(),
                        },
                    )
            except ValidationError:
                await self.send(game.build_complete_json(is_error=True))

    async def wait_ball(self, game: GeneralGame) -> None:
        cnt = 0
        while cnt < 60:
            await asyncio.sleep(1 / 30)
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    "type": "game.message",
                    "message": game.build_game_json(game_start=False),
                },
            )
            cnt += 1

    async def send_game_messages_loop(self, game: GeneralGame) -> None:
        await self.wait_ball(game)  # 시작 전 2초 동안 공 정지

        while True:
            await asyncio.sleep(1 / 30)
            if game.get_status() == GameStatus.PLAYING:
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {"type": "game.message", "message": game.build_game_json()},
                )
            elif game.get_status() == GameStatus.SCORE:
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
                    game.set_status(GameStatus.END)
                    game.set_game_time(GameTimeType.END_TIME.value)
                    break
                game.set_status(GameStatus.PLAYING)
                await self.wait_ball(game)  # 스코어 후 2초 동안 공 정지
            if game.get_status() == GameStatus.ERROR:
                break

    @database_sync_to_async
    def save_game_user_data_to_db(
        self, game_data: dict, winner_id: str, loser_id: str
    ) -> None:
        serializer = GeneralGameLogsSerializer(data=game_data)
        # raise_exception=True 에러 발생시 예외처리 해야함
        if serializer.is_valid(raise_exception=True):
            serializer.save()

        if winner_id and loser_id:
            # winner = Users.objects.get(intra_id=winner_intra_id)
            # winner.win_count += 1
            # winner.save()
            Users.objects.filter(intra_id=winner_id).update(
                win_count=F("win_count") + 1
            )
            Users.objects.filter(intra_id=loser_id).update(
                lose_count=F("lose_count") + 1
            )


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

    @staticmethod
    def _get_wait_list() -> list[dict[str, str]]:
        wait_list = []
        for t in ACTIVE_TOURNAMENTS.values():
            if t.get_status() == TournamentStatus.WAIT and t.get_player_total_cnt() < 4:
                wait_list.append(t.build_tournament_wait_dict())
        return wait_list

    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            await self.accept()
            await self.send(json.dumps({"game_list": self._get_wait_list()}))
        else:
            await self.close()

    # TODO 지울 것
    async def disconnect(self, close_code) -> None:
        super().disconnect(close_code)
        msg = "-----------------------------------\n"
        msg += f"{self.user.nickname}: Tournament Wait disconnect\n"
        msg += "-----------------------------------\n"
        print(msg)

    async def receive(self, text_data: json = None, bytes_data=None) -> None:
        if self.isProcessingComplete:
            return

        data = json.loads(text_data)
        if data.get("message_type") != MessageType.CREATE.value:
            return

        tournament_name = data.get("tournament_name")
        if await self.is_exist_game_data_in_db(tournament_name=tournament_name):
            result = ResultType.FAIL.value
        elif not tournament_name:
            result = ResultType.FAIL.value
        elif len(tournament_name) > MAX_TOURNAMENT_NAME_LENGTH:
            result = ResultType.FAIL.value
        elif tournament_name == NOT_ALLOWED_TOURNAMENT_NAME:
            result = ResultType.FAIL.value
        elif tournament_name in ACTIVE_TOURNAMENTS.keys():
            result = ResultType.FAIL.value
        else:
            result = ResultType.SUCCESS.value
            self.isProcessingComplete = True
            ACTIVE_TOURNAMENTS[tournament_name] = Tournament(
                tournament_name=tournament_name,
                create_user_intra_id=self.user.intra_id,
                create_user_nickname=self.user.nickname,
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

    async def connect(self) -> None:
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            self.tournament_name: str = self.scope["url_route"]["kwargs"][
                "tournament_name"
            ]
            self.group_name_prefix = f"tournament_{self.tournament_name}"
            self.group_name_a = hashlib.md5(
                (self.group_name_prefix + "a").encode("utf-8")
            ).hexdigest()
            self.group_name_b = hashlib.md5(
                (self.group_name_prefix + "b").encode("utf-8")
            ).hexdigest()
            self.tournament = ACTIVE_TOURNAMENTS.get(self.tournament_name)
        if (
            self.tournament is not None
            and self.tournament.get_status() == TournamentStatus.WAIT
        ):
            await self.accept()
            player_number, wait_detail_json = (
                self.tournament.build_tournament_wait_detail_json(
                    intra_id=self.user.intra_id, nickname=self.user.nickname
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

        msg = "---------------------------------------\n"
        msg += f"{self.user.nickname}: touranament game disconnect\n"
        if self.tournament.get_status() == TournamentStatus.READY:
            return

        # 나간 인원과 줄어든 현재 인원을 전송
        await self.channel_layer.group_send(
            self.group_name_a,
            {
                "type": "send.message",
                "message": self.tournament.disconnect_tournament(self.user.nickname),
            },
        )
        await self.channel_layer.group_send(
            self.group_name_b,
            {
                "type": "send.message",
                "message": self.tournament.disconnect_tournament(self.user.nickname),
            },
        )
        if self.tournament.get_player_total_cnt() == 0:
            msg += f"{self.user.nickname}: nobody\n"
            ACTIVE_TOURNAMENTS.pop(self.tournament_name)
        msg += "---------------------------------------\n"
        print(msg)

    async def receive(self, text_data: json = None, bytes_data=None) -> None:
        data = json.loads(text_data)
        if data.get("message_type") == MessageType.WAIT.value:
            number = data.get("number")
            nickname = data.get("nickname")
            if nickname != self.user.nickname:
                return

            if not self.tournament.try_set_ready(
                player_number=number, nickname=nickname
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
        if self.user.nickname == self.round.get_winner():
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

            self.game_group_name = hashlib.md5(
                (self.tournament_name + "_" + str(self.round_number)).encode("utf-8")
            ).hexdigest()
            self.tournament_broadcast = hashlib.md5(
                (self.tournament_name + "_broadcast").encode("utf-8")
            ).hexdigest()
            if (
                self.tournament is not None
                and (
                    (
                        self.tournament.get_status() == TournamentStatus.READY
                        and self.round_number < 3
                    )
                    or (
                        self.tournament.get_status() == TournamentStatus.PLAYING
                        and self.round_number == 3
                    )
                )
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
        msg = "---------------------------------------\n"
        msg += f"{self.user.nickname}: tournament round {self.round_number} disconenct"
        # 게임이 비정상 종료 되었을 때(3라운드 진출자가 대기 중에 나갔을 때도 포함)
        if self.round.get_status() != GameStatus.END or (
            self.tournament.get_round(2 if self.round_number == 1 else 1).get_status()
            != GameStatus.END
            and self.winner_group
        ):
            msg += f"{self.user.nickname}: 비정상 종료\n"
            self.tournament.set_status(TournamentStatus.ERROR)
            data = self.round.build_error_json(self.user.nickname)
            await self.channel_layer.group_send(
                self.tournament_broadcast,
                {"type": "game.message", "message": data},
            )

        # 각 라운드의 loop가 아직 취소되지 않은 경우
        if not self.round.get_is_closed():
            msg += f"{self.user.nickname}: round is not closed\n"
            self.round.set_is_closed(True)
            # 토너먼트가 종료되었을 때
            if (
                self.tournament.get_status() == TournamentStatus.END
                and self.tournament_name in ACTIVE_TOURNAMENTS.keys()
            ):
                msg += f"{self.user.nickname}: tournament is pop\n"
                ACTIVE_TOURNAMENTS.pop(self.tournament_name)
            try:  # cancel() 동작이 끝날 때까지 대기
                self.game_loop_task.cancel()
                await self.game_loop_task
            except:
                pass  # task가 이미 취소된 경우
        await self.channel_layer.group_discard(
            self.tournament_broadcast, self.channel_name
        )
        await self.channel_layer.group_discard(self.game_group_name, self.channel_name)
        # 승자 그룹이 지정되어 채널에 들어가 있을 때
        if self.winner_group:
            await self.channel_layer.group_discard(self.winner_group, self.channel_name)
        msg += f"{self.user.nickname}: disconnect end\n"
        msg += "-------------------------------------------------\n"
        print(msg)

    async def receive(self, text_data: json = None, bytes_data=None) -> None:
        data = json.loads(text_data)
        message_type = data.get("message_type")
        if (
            message_type == MessageType.READY.value
            and self.tournament.get_status() == TournamentStatus.READY
            and self.round_number < int(RoundNumber.FINAL_NUMBER.value)
        ) or (
            message_type == MessageType.READY.value
            and self.tournament.get_status() == TournamentStatus.PLAYING
            and self.round_number == int(RoundNumber.FINAL_NUMBER.value)
        ):
            self.round.set_round_ready(self.user.intra_id)
            if self.round.is_all_ready():
                self.game_loop_task = asyncio.create_task(
                    self.send_game_messages_loop(self.round)
                )

                if self.tournament.is_all_round_ready():
                    if self.round_number != int(RoundNumber.FINAL_NUMBER.value):
                        player1_nickname, player2_nickname = self.tournament.get_round(
                            1
                        ).get_nicknames()
                        await self.channel_layer.group_send(
                            hashlib.md5(
                                (self.tournament_name + "_" + "1").encode("utf-8")
                            ).hexdigest(),
                            {
                                "type": "game.message",
                                "message": json.dumps(
                                    {
                                        "message_type": MessageType.START.value,
                                        "round": "1",
                                        "1p": player1_nickname,
                                        "2p": player2_nickname,
                                    }
                                ),
                            },
                        )
                        player3_nickname, player4_nickname = self.tournament.get_round(
                            2
                        ).get_nicknames()
                        await self.channel_layer.group_send(
                            hashlib.md5(
                                (self.tournament_name + "_" + "2").encode("utf-8")
                            ).hexdigest(),
                            {
                                "type": "game.message",
                                "message": json.dumps(
                                    {
                                        "message_type": MessageType.START.value,
                                        "round": "2",
                                        "1p": player3_nickname,
                                        "2p": player4_nickname,
                                    }
                                ),
                            },
                        )
                        self.tournament.set_round_status(
                            status=GameStatus.PLAYING, is_final=False
                        )
                        self.tournament.set_round_game_time(
                            time_type=GameTimeType.START_TIME, is_final=False
                        )
                        self.tournament.set_status(status=TournamentStatus.PLAYING)

                    else:
                        player1_nickname, player2_nickname = self.tournament.get_round(
                            3
                        ).get_nicknames()
                        await self.channel_layer.group_send(
                            hashlib.md5(
                                (self.tournament_name + "_" + "3").encode("utf-8")
                            ).hexdigest(),
                            {
                                "type": "game.message",
                                "message": json.dumps(
                                    {
                                        "message_type": MessageType.START.value,
                                        "round": "3",
                                        "1p": player1_nickname,
                                        "2p": player2_nickname,
                                    }
                                ),
                            },
                        )
                        self.tournament.set_round_status(
                            status=GameStatus.PLAYING, is_final=True
                        )
                        self.tournament.set_round_game_time(
                            time_type=GameTimeType.START_TIME, is_final=True
                        )
        elif (
            data["message_type"] == MessageType.PLAYING.value
            and self.round.get_status() == GameStatus.PLAYING
        ):
            self.round.key_input(text_data)
        elif (
            data["message_type"] == MessageType.STAY.value
            and self.round.get_status() == GameStatus.END
        ):
            await self.next_match()

    async def wait_ball(self, game: GeneralGame) -> None:
        cnt = 0
        while cnt < 60:
            await asyncio.sleep(1 / 30)
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    "type": "game.message",
                    "message": game.build_game_json(game_start=False),
                },
            )
            cnt += 1

    async def send_game_messages_loop(self, game: Round) -> None:
        await self.wait_ball(game)  # 시작 전 2초 동안 공 정지

        while True:
            await asyncio.sleep(1 / 30)
            if game.get_status() == GameStatus.PLAYING:
                await self.channel_layer.group_send(
                    self.game_group_name,
                    {"type": "game.message", "message": game.build_game_json()},
                )
            elif game.get_status() == GameStatus.SCORE:
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
                    game.set_status(GameStatus.END)
                    game.set_game_time(GameTimeType.END_TIME.value)
                    break
                game.set_status(GameStatus.PLAYING)
                await self.wait_ball(game)  # 스코어 후 2초 동안 공 정지
            if self.tournament.get_status() == TournamentStatus.ERROR:
                break

    async def next_match(self) -> None:
        if self.round_number == 3:
            self.tournament.set_status(TournamentStatus.END)
            try:
                await self.save_tournament_game_user_data_to_db()
                await self.channel_layer.group_send(
                    self.tournament_broadcast,
                    (
                        {
                            "type": "game.message",
                            "message": self.tournament.build_tournament_complete_json(),
                        }
                    ),
                )
            except ValidationError:
                await self.channel_layer.group_send(
                    self.tournament_broadcast,
                    (
                        {
                            "type": "game.message",
                            "message": self.tournament.build_tournament_complete_json(
                                is_error=True
                            ),
                        }
                    ),
                )
        else:
            round1, round2 = self.tournament.get_round(1), self.tournament.get_round(2)
            self.winner_group = hashlib.md5(
                (self.tournament_name + "_winner").encode("utf-8")
            ).hexdigest()
            await self.channel_layer.group_add(self.winner_group, self.channel_name)
            if (
                round1.get_status() == GameStatus.END
                and round2.get_status() == GameStatus.END
            ):
                await self.channel_layer.group_send(
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
    def save_tournament_game_user_data_to_db(self) -> None:
        for i in range(1, 4):
            data = self.tournament.get_db_datas(i)
            serializer = TournamentGameLogsSerializer(data=data)
            if serializer.is_valid(raise_exception=True):
                serializer.save()
            winner_id, loser_id = self.tournament.get_winner_loser_intra_ids(i)
            if winner_id and loser_id:
                Users.objects.filter(intra_id=winner_id).update(
                    win_count=F("win_count") + 1
                )
                Users.objects.filter(intra_id=loser_id).update(
                    lose_count=F("lose_count") + 1
                )
