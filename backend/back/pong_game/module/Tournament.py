import json

from .GameSetValue import TournamentStatus
from .Player import Player
from .Round import Round


class Tournament:
    def __init__(self, tournament_name: str, create_user_intra_id: str):
        self.tournament_name: str = tournament_name
        self.round_list: list[Round or None] = [None, None, None]
        self.player_list: list[Player or None] = [
            Player(number=1, intra_id=create_user_intra_id),
            None,
            None,
            None,
        ]
        self.player_total_cnt: int = 1
        self.status: TournamentStatus = TournamentStatus.WAIT

    def build_tournament_wait_dict(self) -> dict:
        return {
            "tournament_name": self.tournament_name,
            "wait_num": str(self.player_total_cnt),
        }
