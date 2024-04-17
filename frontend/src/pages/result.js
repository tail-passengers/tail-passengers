import { $ } from "../utils/querySelector.js";
import { navigate } from "../utils/navigate.js";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";


function GameResult({ initialState }) {
	this.state = initialState;
	this.$element = document.createElement("div");

	this.render = () => {
		$("#nav-bar").hidden = true;
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
									<div class="my-3"></div>										
											<div class="h1 text-center tp-color-secondary">${locale.result.mainText}</div>
									</div>
									<div class="my-3"></div>
									<div class="row justify-content-center default-container">
										<div class="h3 text-center tp-color-secondary">${locale.result.winner}</div>
										<div class="h2 text-center tp-color-secondary">${winner}</div>
										<div class="my-3"></div>
										<div class="h4 text-center tp-color-secondary">${loser}</div>
									</div>
									<div class="my-3"></div>
									<div class="tp-sl-card-container default-container text-center">
            					<div class="tp-sl-btn-parent col">
                				<button type="submit" id="homeBtn" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-single-btn card h-100">${locale.result.goHome} 
                				</button>
										</div>
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
					<div class="content default-container">
							<div class="container">
									<div class="mb-3 mt-3">
									<div class="my-3"></div>										
											<div class="h1 text-center tp-color-secondary">${locale.result.mainText}</div>
									</div>
									<div class="my-3"></div>
									<div class="row justify-content-center default-container">
										<div class="h3 text-center tp-color-secondary">${locale.result.winner}</div>
										<div class="h2 text-center tp-color-secondary">${winner}</div>
										<div class="my-3"></div>
										<div class="h4 text-center tp-color-secondary">${loser} ${etc1} ${etc2}</div>
									</div>
									<div class="my-3"></div>
									<div class="tp-sl-card-container default-container text-center">
            				<div class="tp-sl-btn-parent col">
                			<button type="submit" id="homeBtn" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-single-btn card h-100">${locale.result.goHome} 
                			</button>
										</div>
									</div>
								</div>
							</div>
					</div>
			`;
		}
		const homeBtn = this.$element.querySelector("#homeBtn");
		homeBtn.addEventListener("click", () => {
			$("#nav-bar").hidden = false;
			let targetURL = `https://${process.env.BASE_IP}`;
			navigate(targetURL);
		});
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

	this.init();
}

export default GameResult;
