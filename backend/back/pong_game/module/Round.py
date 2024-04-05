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
        return {
            "message_type": MessageType.START.value,
            "round": self.round_number.value,
        }

    def build_end_json(self) -> json:
        self.winner = (
            self.player1.get_intra_id()
            if self.score1 > self.score2
            else self.player2.get_intra_id()
        )
        self.loser = (
            self.player2.get_intra_id()
            if self.score1 > self.score2
            else self.player1.get_intra_id()
        )
        return {
            "message_type": MessageType.END.value,
            "round": self.round_number.value,
            "winner": self.winner,
            "loser": self.loser,
        }

    def build_stay_json(self) -> json:
        self.winner = (
            self.player1.get_intra_id()
            if self.score1 > self.score2
            else self.player2.get_intra_id()
        )
        self.loser = (
            self.player2.get_intra_id()
            if self.score1 > self.score2
            else self.player1.get_intra_id()
        )
        return {
            "message_type": MessageType.STAY.value,
            "round": self.round_number.value,
            "winner": self.winner,
            "loser": self.loser,
        }

    def get_winner(self) -> str:
        return self.winner

    def get_is_closed(self) -> bool:
        return self.is_closed

    def set_ready(self, intra_id: str) -> None:
        if intra_id == self.player1.get_intra_id():
            self.player1.set_status(PlayerStatus.READY)
        elif intra_id == self.player2.get_intra_id():
            self.player2.set_status(PlayerStatus.READY)

    def set_is_closed(self, is_closed: bool) -> None:
        self.is_closed = is_closed
