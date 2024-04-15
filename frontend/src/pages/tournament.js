import { $ } from "../utils/querySelector.js";
import { navigate } from "../utils/navigate.js";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";

function Tournament({ $app, initialState }) {

	let gameSocket, tournamentName, round, playerNum = 0, data, nickName = "", versusId;
	let navBarHeight = $(".navigation-bar").clientHeight;
	let footerHeight = $(".tp-footer-container").clientHeight;
	const language = getCurrentLanguage();
	const locale = locales[language] || locales.en;

	//초기 토너먼트 테이블 렌더
	this.render = () => {
		this.$element.innerHTML = `
					<div class="content default-container">
							<div class="container">
									<div class="mb-3 mt-3">
											<div class="h1 text-left tp-color-secondary">${locale.tournament.mainText}</div>
											<div class="h4 text-left tp-color-secondary">${locale.tournament.mainTextDesc}</div>
									</div>
									<div class="row justify-content-center default-container">
											<div class="tp-sl-card-row">
													<div class="table-responsive" style="opacity:100%">
															<table class="table table-dark table-responsive-md" style="border-spacing: 0 10px;">
																	<thead>
																			<tr class="text-center align-middle">
																					<th class="tp-bgc-secondary">No. </th>
																					<th class="tp-bgc-secondary">${locale.tournament.list}</th>
																					<th class="tp-bgc-secondary"></th>
																			</tr>
																	</thead>
																	<tbody>
																	</tbody>
															</table>
															<div class="tp-sl-btn-parent col">
																<button id="createTournamentBtn" class="tp-btn-primary"> 
																	<div class="card-body row">
																	<p class="tp-sl-card-button-text default-container">${locale.tournament.createBtn}</p>
																	</div>
																</button>
																<button id="refreshBtn" class="tp-btn-primary ">${locale.tournament.refresh}
																</button>
															</div>
													</div>
											</div>
									</div>
							</div>
					</div>
			`;
		// Create New Tournament 버튼 클릭 이벤트 핸들러 등록
		const createTournamentBtn = this.$element.querySelector("#createTournamentBtn");
		createTournamentBtn.addEventListener("click", () => {
			tournamentName = prompt(`${locale.tournament.noticePrompt}`);
			const message = {
				"message_type": "create",
				"tournament_name": tournamentName
			}
			gameSocket.send(JSON.stringify(message));
			// };
		});
		// Refresh 버튼 클릭 이벤트 핸들러 등록
		const refreshBtn = this.$element.querySelector("#refreshBtn");
		refreshBtn.addEventListener("click", () => {
			this.render();
		});

		this.getTournamentList();
	};

	// 서버로 wait 소켓 연결하고 토너먼트 리스트 불러옴
	this.getTournamentList = async () => {
		try {
			await this.connectWebSocket("wait");
			gameSocket.addEventListener('message', (event) => {
				const data = JSON.parse(event.data);
				console.log("Received data:", data);
				if (data.game_list) {
					// 토너먼트 리스트를 받은 경우
					this.fillTable(data.game_list);
				} else if (data.message_type === "create") {
					if (data.result === "success") {
						// 방 생성 성공 시 처리
						this.renderWaiting();
					} else if (data.result === "fail") {
						// 방 생성 실패 시 처리
						alert(`${locale.tournament.createFail}`);
						this.render();
					}
				}
			});
		} catch (error) {
			console.error("Error socket connect:", error);
		}
	};

	//받은 데이터로 리스팅
	this.fillTable = (gameList) => {
		const tableBody = this.$element.querySelector("tbody");
		if (!tableBody) {
			console.error("Table body element not found.");
			return;
		}

		if (Array.isArray(gameList) && gameList.length > 0) {
			const tableRows = gameList.map((game, index) => `
				<tr>
						<td class="text-center align-middle col-1">${index + 1}</td>
						<td class="text-center align-middle col-2">
								<span class="tournamentNameText" style="cursor: pointer; color: #E5CC5E;">${game.tournament_name}</span>
						</td>
						<td class="text-center align-middle col-1">${game.wait_num}/4</td>
				</tr>
					`).join("");

			tableBody.innerHTML = tableRows;
			// 토너먼트 리스트 클릭 이벤트 핸들러 등록
			const tournamentNameTexts = tableBody.querySelectorAll(".tournamentNameText");
			tournamentNameTexts.forEach((text) => {
				text.addEventListener("click", () => {
					// 선택된 토너먼트 이름을 전역 변수 tournamentName에 할당
					tournamentName = text.textContent;
					console.log(tournamentName);
					// 선택된 토너먼트로 renderWaiting 호출하여 소켓 연결 시도
					this.renderWaiting();
				});
			});
		} else {
			tableBody.innerHTML = `<tr><td colspan='3' class='text-left'>${locale.tournament.noGame}</td></tr>`;
		}
	};

	// 새로운 토너먼트 생성시 참가 대기소켓 연결
	this.renderWaiting = async () => {
		try {
			await this.connectWebSocket(tournamentName); // 기존의 메세지 리스너 같이 사라짐
			gameSocket.addEventListener('message', (event) => {
				data = JSON.parse(event.data);
				if (data.message_type == "wait") {
					if (nickName == "" || nickName == data.nickname) {
						nickName = data.nickname;
						playerNum = data.number;
						sessionStorage.setItem('nickName', data.nickname);
					}

					console.log("I am : " + playerNum + " " + nickName);
					gameSocket.send(event.data);


					console.log("Received 대기중 data:", data);
					this.$element.innerHTML = `
					<div class='text-center h1 text-left tp-color-secondary'>${locale.tournament.waiting}</div>
					<div class='text-center h1 text-left tp-color-secondary'>${data.total} / 4</div>
					<div class="text-center">
							<button id="goBackToListBtn" class="btn tp-btn-primary">${locale.tournament.goBack}</button>
					</div>
			`;
					// "Go back to list" 버튼 클릭 이벤트 핸들러 등록
					const goBackToListBtn = this.$element.querySelector("#goBackToListBtn");
					goBackToListBtn.addEventListener("click", this.goBackToList);
				}
				else if (data.message_type == "ready") {
					// this.renderPlaying(data);
					console.log('ready');
					// round 저장, 1p, 2p 나랑 versus 저장
					round = data.round;
					console.log('round = ', round);
					if (data["1p"] == nickName) {
						playerNum = "player1"
						versusId = data["2p"];
					}
					else {
						playerNum = "player2"
						versusId = data["1p"];
					}
					sessionStorage.setItem('playerNum', playerNum);
					sessionStorage.setItem('Data', JSON.stringify(data));
					sessionStorage.setItem('gameMode', 'tournament_game');
					sessionStorage.setItem('tournamentName', tournamentName);
					sessionStorage.setItem('versusId', versusId);
					let tournamentURL = `${tournamentName}/${round}`;
					sessionStorage.setItem('idValue', tournamentURL);
					let targetURL = `https://${process.env.BASE_IP}/tournament_game/${tournamentURL}`;
					navigate(targetURL);
					// 저장된 토너먼트 모드, 토너먼트방이름, 라운드 합쳐서 스토리지에 저장 후 게임 연결
				}
			});
		} catch (error) {
			console.error("뭔가;; 잘못됨:", error);
		}
	};

	this.goBackToList = () => {
		// 소켓 연결을 끊음
		if (gameSocket) {
			gameSocket.close();
			gameSocket = null;
		}
		// 토너먼트 리스트를 다시 요청
		this.render();
	};

	//소켓 연결시 사용
	this.connectWebSocket = async (url) => {
		return new Promise((resolve, reject) => {
			gameSocket = new WebSocket(`wss://${process.env.BASE_IP}/ws/tournament_game/${url}/`);

			gameSocket.onopen = () => {
				console.log('WebSocket connected');
				resolve(gameSocket);
			};

			gameSocket.onerror = (error) => {
				reject(error);
			};
		});
	};



	this.state = initialState;
	this.$element = document.createElement("div");
	this.$element.className = "content";
	// 기본적인 SPA 페이지 로드동작
	this.init = () => {
		let parent = $("#app");
		const child = $(".content");
		if (child) {
			parent.removeChild(child);
			parent.appendChild(this.$element);
		}
		let body = $("body");
		const canvas = $("canvas");
		if (canvas) {
			body.removeChild(canvas);
		}
		this.render();
	};
	window.addEventListener(
		"languageChange",
		function () {
			this.render();
		}.bind(this)
	);

	this.init();
}

export default Tournament;