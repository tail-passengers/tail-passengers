import { $ } from "../utils/querySelector.js";
import { getCurrentLanguage } from "../utils/languageUtils";
import { navigate } from "../utils/navigate.js";
import locales from "../utils/locales/locales";

function Loading($container) {
	this.$container = $container;
	let gameIdValue, initSocket = null;

	this.setState = () => {
		this.render();
	};

	this.render = () => {
		$("#nav-bar").hidden = true;
		const language = getCurrentLanguage();
		const locale = locales[language] || locales.en;

		this.$container.innerHTML = `
          <div class="content container tp-color-secondary">
            <div class="default-container h2">${locale.selectMode.multiMode}</div>
						<div class="tp-sl-card-container default-container text-center">
            					<div class="tp-sl-btn-parent col">
            <button id="backBtn" class="btn tp-btn-primary">${locale.loading.back}</button>
          </div>
					</div>
					</div>
        `;

		const backBtn = document.getElementById("backBtn");
		backBtn.addEventListener("click", (event) => {
			event.preventDefault();
			if (initSocket != null) {
				initSocket.close();
				initSocket = null;
			}
			$("#nav-bar").hidden = false;
			history.back();
		});

		if (initSocket != null) {
			initSocket.close();
			initSocket = null;
		}
		initSocket = new WebSocket(`wss://${process.env.BASE_IP}/ws/general_game/wait/`);
		initSocket.addEventListener('message', idSocketConnect);
	}

	function closeSocket() {
		//게임중 뒤로가기면 소켓 닫기, 아닌 경우는 직접 소켓 처리
		if (initSocket && initSocket.readyState <= 1) {
			initSocket.close();
			console.log("closed socket");
		}
		$("#nav-bar").hidden = false;
		window.removeEventListener("popstate", closeSocket);
	}

	const idSocketConnect = (event) => {
		window.addEventListener("popstate", closeSocket);
		initSocket.close();
		let data = JSON.parse(event.data);
		gameIdValue = data.game_id;
		// 현재 연결된 소켓을 세션 스토리지에 저장합니다.
		sessionStorage.setItem("idValue", gameIdValue);
		sessionStorage.setItem("gameMode", "general_game");

		const targetURL = `https://${process.env.BASE_IP}/general_game/${gameIdValue}`;
		navigate(targetURL);
	}

	this.render();
}

export default Loading;
