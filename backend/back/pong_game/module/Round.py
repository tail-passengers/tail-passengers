from .Game import GeneralGame
from .GameSetValue import RoundNumber
from .Player import Player


class Round(GeneralGame):
    def __init__(self, player1: Player, player2: Player, round_number: RoundNumber):
        super().__init__(player1, player2)
        self.round_number: RoundNumber = round_number
