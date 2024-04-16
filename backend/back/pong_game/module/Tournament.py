import json

from .GameSetValue import (
    TournamentStatus,
    MessageType,
    PlayerNumber,
    TOURNAMENT_PLAYER_MAX_CNT,
    PlayerStatus,
    TournamentGroupName,
    RoundNumber,
    GameStatus,
    GameTimeType,
)
from .Player import Player
from .Round import Round


class Tournament:
    def __init__(
        self,
        tournament_name: str,
        create_user_intra_id: str,
        create_user_nickname: str,
    ):
        self.tournament_name: str = tournament_name
        self.round_list: list[Round or None] = [None, None, None]
        self.player_list: list[Player or None] = [
            Player(
                number=1, intra_id=create_user_intra_id, nickname=create_user_nickname
            ),
            None,
            None,
            None,
        ]
        self.nickname_list: list[str] = ["", "", "", ""]
        self.player_total_cnt: int = 1
        self.status: TournamentStatus = TournamentStatus.WAIT

    def build_tournament_wait_dict(self) -> dict:
        return {
            "tournament_name": self.tournament_name,
            "wait_num": str(self.player_total_cnt),
        }

    def _join_tournament_with_intra_id(
        self, intra_id: str, nickname: str
    ) -> PlayerNumber:
        for idx, player in enumerate(self.player_list):
            if player is None:
                self.player_list[idx] = Player(
                    number=2 if idx % 2 else 1, intra_id=intra_id, nickname=nickname
                )
                self.player_total_cnt += 1
                if self.player_total_cnt == TOURNAMENT_PLAYER_MAX_CNT:
                    self.status = TournamentStatus.READY
                return list(PlayerNumber)[idx]
            elif player.get_intra_id() == intra_id:
                return PlayerNumber.PLAYER_1

    def build_tournament_wait_detail_json(
        self, intra_id: str, nickname: str
    ) -> tuple[str, json]:
        player_number = self._join_tournament_with_intra_id(
            intra_id=intra_id, nickname=nickname
        ).value
        return player_number, json.dumps(
            {
                "message_type": MessageType.WAIT.value,
                "nickname": nickname,
                "total": self.player_total_cnt,
                "number": player_number,
            }
        )

    def build_tournament_ready_json(
        self,
        team_name: TournamentGroupName,
        player1_nickname: str = None,
        player2_nickname: str = None,
    ) -> json:
        if team_name == TournamentGroupName.A_TEAM:
            self.round_list[0] = Round(
                self.player_list[0], self.player_list[1], RoundNumber.ROUND_1
            )
            return json.dumps(
                {
                    "message_type": MessageType.READY.value,
                    "round": RoundNumber.ROUND_1.value,
                    "1p": self.player_list[0].get_nickname(),
                    "2p": self.player_list[1].get_nickname(),
                }
            )
        elif team_name == TournamentGroupName.B_TEAM:
            self.round_list[1] = Round(
                self.player_list[2], self.player_list[3], RoundNumber.ROUND_2
            )
            return json.dumps(
                {
                    "message_type": MessageType.READY.value,
                    "round": RoundNumber.ROUND_2.value,
                    "1p": self.player_list[2].get_nickname(),
                    "2p": self.player_list[3].get_nickname(),
                }
            )
        elif team_name == TournamentGroupName.FINAL_TEAM:
            player1, player2 = None, None
            for idx, player in enumerate(self.player_list):
                if player.get_nickname() == player1_nickname:
                    player1 = player
                elif player.get_nickname() == player2_nickname:
                    player2 = player
            player1.set_status(PlayerStatus.READY)
            player2.set_status(PlayerStatus.READY)
            player1.set_number(1)
            player2.set_number(2)
            self.round_list[2] = Round(player1, player2, RoundNumber.ROUND_3)
            return json.dumps(
                {
                    "message_type": MessageType.READY.value,
                    "round": RoundNumber.ROUND_3.value,
                    "1p": player1_nickname,
                    "2p": player2_nickname,
                }
            )

    def build_tournament_complete_json(self, is_error=False) -> json:
        return json.dumps(
            {
                "message_type": (
                    MessageType.ERROR.value if is_error else MessageType.COMPLETE.value
                ),
                "player1": self.nickname_list[0],
                "player2": self.nickname_list[1],
                "player3": self.nickname_list[2],
                "player4": self.nickname_list[3],
            }
        )

    def disconnect_tournament(self, nickname: str) -> json:
        data = {"message_type": MessageType.WAIT.value}
        for idx, player in enumerate(self.player_list):
            if player is not None and player.get_nickname() == nickname:
                self.player_list[idx] = None
                self.player_total_cnt -= 1
                data["nickname"] = nickname
                data["total"] = self.player_total_cnt
                data["number"] = list(PlayerNumber)[idx].value
        return json.dumps(data)

    def is_all_ready(self) -> bool:
        for player in self.player_list:
            if player is None:
                return False
            if player.get_status() != PlayerStatus.READY:
                return False
        self.nickname_list = [player.get_nickname() for player in self.player_list]
        return True

    def is_all_round_ready(self):
        if self.round_list[0].is_all_ready() and self.round_list[1].is_all_ready():
            return True
        return False

    def get_status(self) -> TournamentStatus:
        return self.status

    def get_player_total_cnt(self) -> int:
        return self.player_total_cnt

    def get_round(self, round_number: int) -> Round:
        return self.round_list[round_number - 1]

    def get_db_datas(self, round_number: int) -> dict:
        db_data = self.round_list[round_number - 1].get_db_data()
        db_data["tournament_name"] = self.tournament_name
        db_data["round"] = round_number
        db_data["is_final"] = round_number == 3
        return db_data

    def get_winner_loser_intra_ids(self, round_number: int) -> tuple:
        return self.round_list[round_number - 1].get_winner_loser_intra_id()

    def set_status(self, status: TournamentStatus) -> None:
        self.status = status

    def try_set_ready(self, player_number: str, nickname: str) -> bool:
        player_numbers = [player.value for player in PlayerNumber]
        idx = player_numbers.index(player_number)
        if (
            self.player_list[idx] is None
            or self.player_list[idx].get_nickname() != nickname
        ):
            return False
        self.player_list[idx].set_status(PlayerStatus.READY)
        return True

    def set_round_status(self, status: GameStatus, is_final: bool) -> None:
        if is_final:
            self.round_list[int(RoundNumber.FINAL_NUMBER.value) - 1].set_status(status)
        else:
            for i in range(int(RoundNumber.FINAL_NUMBER.value) - 1):
                self.round_list[i].set_status(status)

    def set_round_game_time(self, time_type: GameTimeType, is_final: bool) -> None:
        if is_final:
            self.round_list[int(RoundNumber.FINAL_NUMBER.value) - 1].set_game_time(
                time_type=time_type.value
            )
        else:
            for i in range(int(RoundNumber.FINAL_NUMBER.value) - 1):
                self.round_list[i].set_game_time(time_type=time_type.value)
