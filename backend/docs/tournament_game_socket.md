## Wait Socket

### 1. [Front] Back에게 게임 신청

- `ws/tournament_game/wait` 웹소켓 연결 요청

### 2. [Back] 현재 생성되어 있는 토너먼트 게임 목록을 전달

- wait 상태인 게임들만 보내주기
- TODO 게임 목록이 변할 때마다 프론트한테 보내줄지 고민하기

```json
{
  "game_list": [
    {
      "tournament_name": "{tournament_name}",
      "wait_num": "{wait_num}"
    },
    {
      "tournament_name": "{tournament_name}",
      "wait_num": "{wait_num}"
    }
  ]
}
```

### 3. [Front] 생성된 토너먼트 게임 목록과 게임 생성 버튼 그리기

### 4. [Front] 게임 생성 혹은 참가 버튼 누름

#### 4.1.1 [Front] 생성일 때

```json
{
  "message_type": "create",
  "tournament_name": "{tournament_name}"
}
```

#### 4.1.2 [Back] 중복 확인 후, 결과 전송

- 방 이름이 wait일 경우도 실패로 반환
- 실패 시, alert 같은 알림 띄우고 대기방 유지

```json
{
  "message_type": "create",
  "result": "{success / fail}"
}
```

### 5. [Front] 결과 수신 후, 소켓 연결(게임 참가는 바로 여기서 시작)

- `ws/tournament_game/{tournament_name}/` 웹소켓 연결 요청

### 6. [Back] 클라이언트에게 wait 전송

- 대기방 인원 전체에게 발송
- 프론트가 저장하고 있는 nickname 값이 기본값이면 nickname와 number 저장
- 이후에는 total만 갱신하면서 대기 중인 인원 표시

```json
{
  "message_type": "wait",
  "nickname": "{nickname}",
  "total": "{join_player_num}",
  "number": "{player1 / player2 / player3 / player4}"
}
```

### 7. [Front] wait 수신하고 Back에게 wait 전송

```json
{
  "message_type": "wait",
  "nickname": "{nickname}",
  "total": "{join_player_num}",
  "number": "{player1 / player2 / player3 / player4}"
}
```

### 7.1 [Back] 만약 wait 중에 플레이어 접속 종료 시

- 접속 종료한 유저 정보 전달

```json
{
    "message_type": "wait",
    "nickname": "{접속 종료한 nickname}",
    "total": "{join_player_num}",
    "number": "{player1 / player2 / player3 / player4}"
}
```

### 8. [Back] 인원이 모두 모이면 프론트한테 보내기

```json
{
  "message_type": "ready",
  "round": "{1 / 2}",
  "1p": "{nickname}",
  "2p": "{nickname}"
}
```

### 9. [Front] 각 round에 접속

- `ws/tournament_game/{tournament_name}/{round}/` 웹소켓 연결 요청

```json
{
  "message_type": "ready",
  "round": "{1 / 2 / 3}",
  "1p": "{nickname}",
  "2p": "{nickname}"
}
```

### 10. [Back] 클라이언트에게 start 전송

- 양쪽에게 ready 메시지를 수신하면 start 메시지를 전송

```json
{
  "message_type": "start",
  "round": "{1 / 2 / 3}",
  "1p": "{nickname}",
  "2p": "{nickname}" 
}
```

### 11. [Back] 클라이언트에게 현재 게임 상태 전송

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

### 12. [Front] 키 입력 시, Back에게 전송

- release는 뗀 것을 의미
- press는 누른 것을 의미

```json
{
  "message_type": "key",
  "number": "{player1 / player2}",
  "input": "{ left_press / left_release / right_press / right_release / protego_maxima }"
}
```

### 중간에 플레이어 접속 종료 시

```json
{
    "message_type": "error",
    "nickname": "{접속 종료한 nickname}"
}
```

### 13. [Back] 클라이언트에게 득점 시 전송

```json
{
    "message_type": "score",
    "player1_score": "{player1_score}",
    "player2_score": "{player2_score}"
}
```

### 14. [Back] 클라이언트에게 게임 종료 시 전송

```json
{
    "message_type": "end",
    "round": "{1 / 2 / 3}",
    "winner": "{player1 / player2}",
    "loser": "{player1 / player2}"
}
```

### 15. [Front] 서버에게 받은 것 그대로 응답

```json
{
    "message_type": "{stay / end}",
    "round": "{1 / 2 / 3}",
    "winner": "{player1 / player2}",
    "loser": "{player1 / player2}"
}
```

### 16.1 [Front] 진 클라이언트의 경우

- end 보내고 접속 종료

### 16.2 [Front] 이긴 클라이언트의 경우

- stay 보내고 ready 기다리기

### 16.2.1 [Back] 1,2 라운드인 경우

- 1,2 라운드가 모두 끝날 때까지 기다리다가 끝나면 ready 전송

```json
{
  "message_type": "ready",
  "round": "3",
  "1p": "{nickname}",
  "2p": "{nickname}"
}
```

### 16.2.2 [Front] 1,2 라운드인 경우

- 이긴 사람만 변경
- `ws/tournament_game/{tournament_name}/3/` 웹소켓 연결 후, ready 전송
- 그 후, 9번 과정부터 시작

```json
{
  "message_type": "ready",
  "round": "3",
  "1p": "{nickname}",
  "2p": "{nickname}"
}
```

### 16.2.3 [Back] DB 생성해서 저장

- DB 저장 성공 시
- 결승전 인원한테만 전송

```json
{
  "message_type": "complete",
  "winner": "{최종 승자의 nickname}",
  "loser": "{준우승자의 nickname}",
  "etc1": "{round 1 패배자의 nickname}",
  "etc2": "{round 2 패배자의 nickname}"
}
```

- DB 저장 실패 시

```json
{
  "message_type": "error",
  "player1": "{nickname}",
  "player2": "{nickname}",
  "player3": "{nickname}",
  "player4": "{nickname}"
}
```
