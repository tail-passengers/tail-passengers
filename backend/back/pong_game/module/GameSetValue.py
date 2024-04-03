from enum import Enum

FIELD_WIDTH: int = 1200
FIELD_LENGTH: int = 3000
PADDLE_WIDTH: int = 200
PADDLE_HEIGHT: int = 30
PADDLE_SPEED: int = 30
PADDLE_CORRECTION: int = 5
BALL_SPEED_X: int = 0
BALL_SPEED_Z: int = -10
BALL_RADIUS: int = 20
MAX_SCORE: int = 5
PADDLE_BOUNDARY: int = FIELD_WIDTH // 2 - PADDLE_WIDTH // 2
TOURNAMENT_PLAYER_MAX_CNT: int = 4
NOT_ALLOWED_TOURNAMENT_NAME: str = "wait"


class KeyboardInput(Enum):
    LEFT_PRESS = "left_press"
    LEFT_RELEASE = "left_release"
    RIGHT_PRESS = "right_press"
    RIGHT_RELEASE = "right_release"
    SPACE = "space"


class PlayerStatus(Enum):
    WAIT = "wait"
    READY = "ready"
    PLAYING = "playing"
    SCORE = "score"
    END = "end"


class MessageType(Enum):
    WAIT = "wait"
    CREATE = "create"
    READY = "ready"
    START = "start"
    PLAYING = "playing"
    SCORE = "score"
    END = "end"
    COMPLETE = "complete"
    ERROR = "error"


class GameTimeType(Enum):
    START_TIME = "start_time"
    END_TIME = "end_time"


class RoundNumber(Enum):
    ROUND_1 = "1"
    ROUND_2 = "2"
    ROUND_3 = "3"


class TournamentStatus(Enum):
    WAIT = "wait"
    READY = "ready"
    PLAYING = "playing"
    END = "end"


class ResultType(Enum):
    SUCCESS = "success"
    FAIL = "fail"


class PlayerNumber(Enum):
    PLAYER_1 = "player1"
    PLAYER_2 = "player2"
    PLAYER_3 = "player3"
    PLAYER_4 = "player4"


class TournamentGroupName(Enum):
    A_TEAM = "a_team"
    B_TEAM = "b_team"
