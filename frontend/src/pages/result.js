import { $ } from "../utils/querySelector.js";
import { navigate } from "../utils/navigate.js";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";


function GameResult({ initialState }) {
	this.state = initialState;
	this.$element = document.createElement("div");

	this.render = () => {
		const language = getCurrentLanguage();
		const locale = locales[language] || locales.en;

		const gameMode = sessionStorage.getItem('gameMode');
		const winner = sessionStorage.getItem('winner');
		const loser = sessionStorage.getItem('loser');

		if (gameMode == "general_game") {
			this.$element.innerHTML = `
					<div class="content default-container">
							<div class="container">
									<div class="mb-3 mt-3">
											<div class="h1 text-center tp-color-secondary">${locale.mainText.mainText}</div>
											<div class="h4 text-center tp-color-secondary">${locale.mainText.mainTextDesc}</div>
									</div>
									<div class="row justify-content-center default-container">
										<div class="h2 text-center tp-color-secondary">${locale.result.winner}게임 결과</div>
										<div class="h2 text-center tp-color-secondary">${winner}1등</div>
										<div class="h2 text-center tp-color-secondary">${locale.mainText.result}우승자</div>
										<div class="h2 text-center tp-color-secondary">${loser}2등</div>
									</div>
									<div class="tp-sl-btn-parent col">
											<button id="refreshBtn" class="tp-btn-primary ">${locale.result.goHome}
											</button>
									</div>
								</div>
							</div>
					</div>
			`;

		}
		else if (gameMode == "tournament_game") {
			const etc1 = sessionStorage.getItem('etc1');
			const etc2 = sessionStorage.getItem('etc2');
			this.$element.innerHTML = `
		<div class="tp-sl-card-content-child">
				<div>
						<div class="loadingMsg default-container text-center tp-color-secondary">
								<div class="h2">${locale.result.result}게임 결과</div>
								<div class="h2">${locale.result.result}우승자</div>
								<div class="h2">${winner}1등</div>
								<div class="h2">${loser}2등</div>
								<div class="h2">${locale.result.result}쩌리1 쩌리2</div>
						</div>
				</div>
				<div class="tp-sl-btn-parent col">
					<button id="refreshBtn" class="tp-btn-primary ">${locale.tournament.refresh}
					</button>
				</div>
		</div>
`;

			// Refresh 버튼 클릭 이벤트 핸들러 등록
			const homeBtn = this.$element.querySelector("#homeBtn");
			homeBtn.addEventListener("click", () => {
				let targetURL = `https://${process.env.BASE_IP}`;
				navigate(targetURL);
			});
		}
	};

	this.init = () => {
		let parent = $("#app");
		const child = $(".content");
		if (parent && child) {
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

export default GameResult;
