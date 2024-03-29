import uuid
from datetime import datetime

from django.db import models
from accounts.models import Users


class GeneralGameLogs(models.Model):
    game_id: str or uuid = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    start_time: datetime = models.DateTimeField()
    end_time: datetime = models.DateTimeField()
    player1: Users = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="player1",
        related_name="general_player1",
    )
    player2: Users = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="player2",
        related_name="general_player2",
    )
    player1_score: int = models.IntegerField()
    player2_score: int = models.IntegerField()

    class Meta:
        db_table = "GeneralGameLogs"
        ordering = ["-start_time"]


class TournamentGameLogs(models.Model):
    tournament_name: str = models.CharField(max_length=20)
    round: int = models.IntegerField()
    player1: Users = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="player1",
        related_name="tournament_player1",
    )
    player2: Users = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="player2",
        related_name="tournament_player2",
    )
    player1_score: int = models.IntegerField()
    player2_score: int = models.IntegerField()
    start_time: datetime = models.DateTimeField()
    end_time: datetime = models.DateTimeField()
    is_final: bool = models.BooleanField()

    class Meta:
        db_table = "TournamentGameLogs"
        ordering = ["-start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["tournament_name", "round"], name="tournament_game_id"
            )
        ]
