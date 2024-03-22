import uuid
from django.db import models


class GeneralGameLogs(models.Model):
    game_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    player1 = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="player1",
        related_name="general_player1",
    )
    player2 = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="player2",
        related_name="general_player2",
    )
    player1_score = models.IntegerField()
    player2_score = models.IntegerField()

    class Meta:
        db_table = "GeneralGameLogs"
        ordering = ["-start_time"]


class TournamentGameLogs(models.Model):
    tournament_name = models.CharField(max_length=20)
    round = models.IntegerField()
    player1 = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="player1",
        related_name="tournament_player1",
    )
    player2 = models.ForeignKey(
        "accounts.Users",
        on_delete=models.CASCADE,
        db_column="player2",
        related_name="tournament_player2",
    )
    player1_score = models.IntegerField()
    player2_score = models.IntegerField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_final = models.BooleanField()

    class Meta:
        db_table = "TournamentGameLogs"
        ordering = ["-start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["tournament_name", "round"], name="tournament_game_id"
            )
        ]
