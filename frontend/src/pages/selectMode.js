import { $ } from "../utils/querySelector.js";
import { navigate } from "../utils/navigate.js";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";

function SelectMode({ initialState }) {
	let gameIdValue, initSocket, targetURL;
	this.state = initialState;
	this.$element = document.createElement("div");
	this.$element.className = "content default-container tp-sl-card-content";

	this.setState = (content) => {
		this.state = content;
		this.render();
	};

	this.render = () => {
		const language = getCurrentLanguage();
		const locale = locales[language] || locales.en;

		this.$element.innerHTML = `
      <div class="tp-sl-card-content-child">
        <div class="tp-sl-title-container default-container text-center tp-color-secondary">
          <h1>${locale.selectMode.mainText}</h1>
        </div> 
        <div class="tp-sl-card-container default-container text-center">
          <form class="tp-sl-card-row tp-sl-card-row-height row g-2">
            <div class="tp-sl-btn-parent col">
                <button type="submit" class="tp-btn-primary tp-sl-btn-primary tp-sl-single-btn card h-100" value="game"> 
                  <div class="card-body row">
                    <div></div>
                    <h5 class="tp-sl-card-title default-container">${locale.selectMode.singleMode}</h5>
                    <p class="tp-sl-card-text default-container">${locale.selectMode.singleModeDesc}</p>
                  </div>
                </button>
            </div>
            <div class="tp-sl-btn-parent col">
                <button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-multi-btn card h-100" value="sockettest">
                  <div class="card-body row">
                    <div></div>
                    <h5 class="tp-sl-card-title default-container">${locale.selectMode.multiMode}</h5>
                    <p class="tp-sl-card-text default-container">${locale.selectMode.multiModeDesc}</p>
                  </div>
                </button>
            </div>
						<div class="tp-sl-btn-parent col">
                <button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-tournament-btn card h-100" value="tournament">
                  <div class="card-body row">
                    <div></div>
                    <h5 class="tp-sl-card-title default-container">${locale.selectMode.tournamentMode}</h5>
                    <p class="tp-sl-card-text default-container">${locale.selectMode.tournamentModeDesc}</p>
                  </div>
                </button>
            </div>
          </form>
        </div>
      </div>
		`;

		const singleBtn = $(".tp-sl-single-btn");
		const multiBtn = $(".tp-sl-multi-btn");
		const tournamentBtn = $(".tp-sl-tournament-btn");
		if (singleBtn) {
			singleBtn.addEventListener("click", function (event) {
				event.preventDefault();
				targetURL = `https://${process.env.BASE_IP}/${this.value}`;
				console.log("targetURL", targetURL);
				navigate(targetURL);
			});
		}
		if (tournamentBtn) {
			tournamentBtn.addEventListener("click", function (event) {
				event.preventDefault();
				targetURL = `https://${process.env.BASE_IP}/${this.value}`;
				console.log("targetURL", targetURL);
				navigate(targetURL);
			});
		}

		if (multiBtn) {
			multiBtn.addEventListener("click", function (event) {
				event.preventDefault();
				const multiTextElement = document.querySelector(".tp-sl-multi-btn .tp-sl-card-text");
				multiTextElement.textContent = "Waiting for other players...";
				initSocket = new WebSocket(`wss://${process.env.BASE_IP}/ws/general_game/wait/`);
				initSocket.addEventListener('message', idSocketConnect);
			});
		}
	};

	const idSocketConnect = (event) => {
		console.log('Message from server ', event.data);
		initSocket.close();
		let data = JSON.parse(event.data);
		gameIdValue = data.game_id;
		// 현재 연결된 소켓을 세션 스토리지에 저장합니다.
		sessionStorage.setItem('idValue', gameIdValue);
		sessionStorage.setItem('gameMode', "general_game");

		targetURL = `https://${process.env.BASE_IP}/general_game/${gameIdValue}`;
		navigate(targetURL);
	}

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

export default SelectMode;
