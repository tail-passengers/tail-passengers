from .Paddle import Paddle
from .GameSetValue import PlayerStatus


class Player:
    def __init__(self, number: int, intra_id: str, nickname: str = None):
        self.number: int = number
        self.intra_id: str = intra_id
        self.nickname: str = nickname if nickname else intra_id
        self.status: PlayerStatus = PlayerStatus.WAIT
        self.paddle: Paddle = Paddle(number)

    def get_number(self) -> int:
        return self.number

    def get_intra_id(self) -> str:
        return self.intra_id

    def get_nickname(self) -> str:
        return self.nickname

    def get_status(self) -> PlayerStatus:
        return self.status

    def get_paddle(self) -> Paddle:
        return self.paddle

    def set_status(self, status: PlayerStatus) -> None:
        self.status = status

    def set_number(self, number: int) -> None:
        self.number = number
        self.paddle.reset_position(number)

    def paddle_handler(self, key_input: str) -> None:
        self.paddle.input_handler(key_input)
