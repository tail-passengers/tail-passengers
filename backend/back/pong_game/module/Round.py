import json

from .GeneralGame import GeneralGame
from .GameSetValue import RoundNumber, PlayerStatus, MessageType
from .Player import Player


class Round(GeneralGame):
    def __init__(self, player1: Player, player2: Player, round_number: RoundNumber):
        super().__init__(player1, player2)
        self.round_number: RoundNumber = round_number
        self.winner: str = ""
        self.loser: str = ""
        self.is_closed: bool = False

    def build_start_json(self) -> json:
        return json.dumps(
            {
                "message_type": MessageType.START.value,
                "round": self.round_number.value,
            }
        )

    def build_end_json(self) -> json:
        self.winner = (
            self.player1.get_nickname()
            if self.score1 > self.score2
            else self.player2.get_nickname()
        )
        self.loser = (
            self.player2.get_nickname()
            if self.score1 > self.score2
            else self.player1.get_nickname()
        )
        return json.dumps(
            {
                "message_type": MessageType.END.value,
                "round": self.round_number.value,
                "winner": self.winner,
                "loser": self.loser,
            }
        )

    def build_stay_json(self) -> json:
        self.winner = (
            self.player1.get_nickname()
            if self.score1 > self.score2
            else self.player2.get_nickname()
        )
        self.loser = (
            self.player2.get_nickname()
            if self.score1 > self.score2
            else self.player1.get_nickname()
        )
        return json.dumps(
            {
                "message_type": MessageType.STAY.value,
                "round": self.round_number.value,
                "winner": self.winner,
                "loser": self.loser,
            }
        )

    def is_all_ready(self) -> bool:
        if self.player1 is None or self.player2 is None:
            return False
        if (
            self.player1.get_status()
            == self.player2.get_status()
            == PlayerStatus.ROUND_READY
        ):
            return True
        return False

    def get_winner(self) -> str:
        return self.winner

    def get_loser(self) -> str:
        return self.loser

    def get_nicknames(self) -> tuple[str, str]:
        return self.player1.get_nickname(), self.player2.get_nickname()

    def get_is_closed(self) -> bool:
        return self.is_closed

    def set_round_ready(self, intra_id: str) -> None:
        if intra_id == self.player1.get_intra_id():
            self.player1.set_status(PlayerStatus.ROUND_READY)
        elif intra_id == self.player2.get_intra_id():
            self.player2.set_status(PlayerStatus.ROUND_READY)

    def set_is_closed(self, is_closed: bool) -> None:
        self.is_closed = is_closed
