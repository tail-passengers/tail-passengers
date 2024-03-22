import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from accounts.models import Users, UserStatusEnum
from collections import deque


class LoginConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            await self.accept()
            await self.update_user_status(self.user, UserStatusEnum.ONLINE)
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            await self.update_user_status(self.user, UserStatusEnum.OFFLINE)

    @database_sync_to_async
    def update_user_status(self, user, status):
        Users.objects.filter(user_id=user.user_id).update(status=status)


class GeneralGameWaitConsumer(AsyncWebsocketConsumer):
    intra_id_list, wait_list = list(), deque()

    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_authenticated and await self.add_wait_list():
            await self.accept()
            if len(GeneralGameWaitConsumer.wait_list) > 1:
                await GeneralGameWaitConsumer.game_match()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            if (
                self in GeneralGameWaitConsumer.wait_list
                and self.user.intra_id in GeneralGameWaitConsumer.intra_id_list
            ):
                GeneralGameWaitConsumer.intra_id_list.remove(self.user.intra_id)
                GeneralGameWaitConsumer.wait_list.remove(self)

    @classmethod
    async def game_match(cls):
        data = '{"game_id": ' + f'"{str(uuid.uuid4())}"' + "}"
        player1 = GeneralGameWaitConsumer.wait_list.popleft()
        player2 = GeneralGameWaitConsumer.wait_list.popleft()
        await player1.send(data)
        await player2.send(data)
        GeneralGameWaitConsumer.intra_id_list.remove(player1.user.intra_id)
        GeneralGameWaitConsumer.intra_id_list.remove(player2.user.intra_id)

    async def add_wait_list(self):
        if self.user.intra_id in GeneralGameWaitConsumer.intra_id_list:
            return False
        GeneralGameWaitConsumer.wait_list.append(self)
        GeneralGameWaitConsumer.intra_id_list.append(self.user.intra_id)
        return True


class GeneralGameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_authenticated:
            self.game_id = self.scope["url_route"]["kwargs"]["game_id"]
            self.game_group_name = f"game_{self.game_id}"
            await self.channel_layer.group_add(self.game_group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            await self.channel_layer.group_discard(
                self.game_group_name, self.channel_name
            )

    async def receive(self, text_data):
        # 게임 로직 추가 필요
        pass
