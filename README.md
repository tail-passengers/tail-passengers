# Tail-passengers

## Run

### git clone

```shell
$ git clone https://github.com/tail-passengers/tail-passengers.git
$ cd tail-passengers
$ git submodule init
$ git submodule update
$ make
```

### update

```shell
$ git submodule update --remote
$ make
```

### login
- 42 oauth는 환경 파일을 따로 설정해야 가능합니다.
- 가능한 test 유저: Harry, Hermione, Ron, Ginny, Luna, Newt, Draco, Cho, Cedric, Gregory, Crabbe

```
https://127.0.0.1/api/v1/login/{test_user}
```

## Modeule

- [x] `Web Major` Use a Framework as backend
- [x] `Web Minor` Use a front-end framework or toolkit
- [x] `Web Minor` Use a database for the backend
- [ ] `Web Major` Store the score of a tournament in the Blockchain
- [x] `User Management Major` Standard user management, authentication, users across tournaments
- [x] `User Management Major` Implementing a remote authentication
- [x] `Gameplay & UX Major` Remote players
- [ ] `Gameplay & UX Major `Multiplayers (more than 2 in the same game)
- [ ] `Gameplay & UX Major` Add Another Game with User History and Matchmaking
- [x] `Gameplay & UX Minor` Game Customization Options
- [ ] `Gameplay & UX Major` Live chat
- [ ] `AI-Algo Major` Introduce an AI Opponent
- [x] `AI-Algo Minor` User and Game Stats Dashboards
- [ ] `Cybersecurity Major` Implement WAF/ModSecurity with Hardened Configuration and HashiCorp Vault for Secrects Management
- [ ] `Cybersecurity Minor` GDPR Compliance Options with User Anonymization, Local Data Management, and Account Deletion
- [ ] `Cybersecurity Major` Implement Two-Factor Authentication (2FA) and JWT
- [ ] `Devops Major` Infrastructure Setup for Log Management
- [ ] `Devops Minor` Monitoring system
- [ ] `Devops Major` Designing the Backend as Microservices
- [x] `Graphics Major` Use of advanced 3D techniques
- [ ] `Accessibility Minor` Support on all devices
- [ ] `Accessibility Minor` Expanding Browser Compatibility
- [x] `Accessibility Minor` Multiple language supports
- [ ] `Accessibility Minor` Add accessibility for Visually Impaired Users
- [ ] `Accessibility Minor` Server-Side Rendering (SSR) Integration
- [ ] `Object oriented Major` Replacing Basic Pong with Server-Side Pong and Implementing an API
- [ ] `Object oriented Major` Enabling Pong Gameplay via CLI against Web Users with API Integration
