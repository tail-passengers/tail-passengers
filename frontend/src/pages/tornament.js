import { $ } from "../utils/querySelector.js";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";

function Tornament({ $app, initialState }) {
	this.state = initialState;
	this.$element = document.createElement("div");
	this.$element.className = "content";
	this.waitSocket = null;
	let tournamentName, playerNum, intraId;

	//초기 토너먼트 테이블 렌더
	this.render = () => {
		const language = getCurrentLanguage();
		const locale = locales[language] || locales.en;
		this.$element.innerHTML = `
        <div class="content default-container">
            <div class="container">
                <div class="mb-3 mt-3">
                    <div class="h1 text-left tp-color-secondary">${locale.tornament.mainText}</div>
                    <div class="h4 text-left tp-color-secondary">${locale.tornament.mainTextDesc}</div>
                </div>
                <div class="row justify-content-center default-container">
                    <div class="tp-sl-card-row">
                        <div class="table-responsive" style="opacity:100%">
                            <table class="table table-dark table-responsive-md" style="border-spacing: 0 10px;">
                                <thead>
                                    <tr class="text-center align-middle">
                                        <th class="tp-bgc-secondary">No. </th>
                                        <th class="tp-bgc-secondary">${locale.tornament.list}</th>
                                        <th class="tp-bgc-secondary"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
														<div class="tp-sl-btn-parent col">
          					          <button id="createTournamentBtn" class="tp-btn-primary"> 
              			        	  <div class="card-body row">
                 			    	    <p class="tp-sl-card-button-text default-container">${locale.tornament.createBtn}</p>
                  			    	  </div>
                  					  </button>
                              <button id="refreshBtn" class="tp-btn-primary ">${locale.tornament.refresh}
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
			tournamentName = prompt("Enter the name of the new tournament:");
			const message = {
				"message_type": "create",
				"tournament_name": tournamentName
			};
			this.waitSocket.send(JSON.stringify(message));
		});
		// Refresh 버튼 클릭 이벤트 핸들러 등록
		const refreshBtn = this.$element.querySelector("#refreshBtn");
		refreshBtn.addEventListener("click", () => {
			this.render();
		});

		this.getTornamentList();
	};

	// 서버로 wait 소켓 연결하고 토너먼트 리스트 불러옴
	this.getTornamentList = async () => {
		try {
			await this.connectWebSocket("wait");
			this.waitSocket.addEventListener('message', (event) => {
				const data = JSON.parse(event.data);
				console.log("Received data:", data);
				// 플레이어 정보 초기화
				playerNum = false;
				intraId = false;
				if (data.game_list) {
					// 토너먼트 리스트를 받은 경우
					this.fillTable(data.game_list);
				} else if (data.message_type === "create") {
					if (data.result === "success") {
						// 방 생성 성공 시 처리
						this.renderWaiting();
					} else if (data.result === "fail") {
						// 방 생성 실패 시 처리
						console.error("Failed to create tournament: duplicated");
						alert("Same name tornament already exist.");
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
			// 토너먼트 이름 버튼에 클릭 이벤트 핸들러 등록
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
			tableBody.innerHTML = "<tr><td colspan='3' class='text-left'>No games available</td></tr>";
		}
	};

	// 새로운 토너먼트 생성시 참가 대기소켓 연결
	this.renderWaiting = async () => {
		try {
			await this.connectWebSocket(tournamentName); // 기존의 메세지 리스너 같이 사라짐
			this.waitSocket.addEventListener('message', (event) => {
				const data = JSON.parse(event.data);
				if (data.message_type == "wait") {
					if (intraId == false || intraId == data.intra_id) {
						intraId = data.intra_id;
						playerNum = data.number;
					}

					console.log("I am : " + playerNum + " " + intraId);
					this.waitSocket.send(event.data);


					console.log("Received 대기중 data:", data);
					this.$element.innerHTML = `
        <div class='text-center h1 text-left tp-color-secondary'>Waiting other players...</div>
        <div class='text-center h1 text-left tp-color-secondary'>${data.total} / 4</div>
        <div class="text-center">
            <button id="goBackToListBtn" class="btn tp-btn-primary">Go back to list</button>
        </div>
    `;
					// "Go back to list" 버튼 클릭 이벤트 핸들러 등록
					const goBackToListBtn = this.$element.querySelector("#goBackToListBtn");
					goBackToListBtn.addEventListener("click", this.goBackToList);
				}
				else if (data.message_type == "ready") {

				}
			});
		} catch (error) {
			console.error("뭔가;; 잘못됨:", error);
		}
	};

	this.goBackToList = () => {
		// 소켓 연결을 끊음
		if (this.waitSocket) {
			this.waitSocket.close();
			this.waitSocket = null;
		}
		// 토너먼트 리스트를 다시 요청
		this.render();
	};

	//소켓 연결시 사용
	this.connectWebSocket = async (url) => {
		return new Promise((resolve, reject) => {
			this.waitSocket = new WebSocket(`wss://${process.env.BASE_IP}/ws/tournament_game/${url}/`);

			this.waitSocket.onopen = () => {
				console.log('WebSocket connected');
				resolve(this.waitSocket);
			};

			this.waitSocket.onerror = (error) => {
				reject(error);
			};
		});
	};



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

	this.init();
}

export default Tornament;