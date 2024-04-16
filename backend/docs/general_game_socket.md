## Wait Socket

### 1. [Front] Back에게 게임 신청

- `ws/general_game/wait` 웹소켓 연결 요청

### 2. [Back] 대기 명단에 넣음

### 3. [Back] 게임 인원 충족 시, game_id 전송

```json
{
  "game_id": "{game_id}"
}
```

### 4. [Front] wait 소켓 종료

## Game Socket

### 1. [Front] 게임 페이지로 이동 및 소켓 연결 요청

- `ws/general_game/{game_id}` 웹소켓 연결 요청

### 2. [Back] 클라이언트에게 ready 전송

```json
{
  "message_type": "ready",
  "nickname": "{nickname}",
  "number": "{player1 / player2}"
}
```

### 3. [Front] ready 수신하고 Back에게 ready 전송

```json
{
  "message_type": "ready",
  "nickname": "{nickname}",
  "number": "{player1 / player2}"
}
```

### 4. [Back] 클라이언트에게 start 전송

- 양쪽에게 ready 메시지를 수신하면 start 메시지를 전송

```json
{
  "message_type": "start",
  "1p": "{nickname}",
  "2p": "{nickname}"
}
```

### 5. [Back] 클라이언트에게 현재 게임 상태 전송

- 1초에 30번 전송
- 이후, 공의 위치 등이 추가될 예정

```json
{
  "message_type": "playing",
  "paddle1": "{paddle1_position_x}",
  "paddle2": "{paddle2_position_x}",
  "ball_x": "{ball_position_x}",
  "ball_z": "{ball_position_z}",
  "ball_vx": "{ball_velocity_x}",
  "ball_vz": "{ball_velocity_z}"
}
```

### 6. [Front] 키 입력 시, Back에게 전송

- release는 뗀 것을 의미
- press는 누른 것을 의미

```json
{
  "message_type": "key",
  "number": "{player1 / player2}",
  "input": "{ left_press / left_release / right_press / right_release / protego_maxima }"
}
```

### 7. [Back] 클라이언트에게 득점 시 전송

```json
{
    "message_type": "score",
    "player1_score": "{player1_score}",
    "player2_score": "{player2_score}"
}
```

### 중간에 플레이어 접속 종료 시

```json
{
    "message_type": "error",
    "nickname": "{접속 종료한 nickname}"
}
```

### 8. [Back] 클라이언트에게 게임 종료 시 전송

```json
{
    "message_type": "end",
    "winner": "{player1 / player2}",
    "loser": "{player1 / player2}"
}
```

### 9. [Front] 게임 종료 메세지를 잘 받음

```json
{
    "message_type": "end",
    "winner": "{player1 / player2}",
    "loser": "{player1 / player2}"
}
```

### 10.[Back] DB 생성해서 저장

- DB 저장 성공 시

```json
{
  "message_type": "complete",
  "player1": "{nickname}",
  "player2": "{nickname}"
}
```

- DB 저장 실패 시

```json
{
  "message_type": "error",
  "player1": "{nickname}",
  "player2": "{nickname}"
}
```
