import { $ } from "../utils/querySelector.js";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";
import { fetchUsers } from "../utils/fetches.js";

function GameResult({ initialState }) {
    this.state = initialState;
    this.$element = document.createElement("div");
    this.$element.className =
        "content default-container tp-sl-card-content tp-pf-content";

    this.render = () => {
        const language = getCurrentLanguage();
        const locale = locales[language] || locales.en;

        this.$element.innerHTML = `
            <div class="tp-color-secondary default-container">
                <p class="tp-rs-title">${locale.result.mainText}</p>
            </div>
            <div class="tp-pf-ht-blank"></div>
            <div class="tp-pf-ht-blank"></div>
            <div class="tp-rs-card-container default-container text-center"></div>
        `;
        renderPlayers();
    };

    const renderPlayers = async() => {
        // const data = await getGameResult(); //TODO - 게임 종료 후 받아오기(소켓? 폴링?)
        const data = await fetchUsers();
        if (data) {
            const playersCard = data
                .map(
                    (data, index) => `
                        <div class="card tp-rs-card tp-rs-btn-primary" data-text="WINNER">
                            <div class="card-body tp-rs-card-body row">
                                <div class="card-title tp-rs-card-title default-container tp-rs-rank col">
                                    ${index + 1}
                                </div>
                                <div class="card-title tp-rs-card-title default-container col">
                                    <img class="tp-pf-photo-thumnail tp-rs-photo-thumnail" src="${data.profile_image}" />
                                </div>
                                <div class="card-title tp-rs-card-title default-container col">
                                    ${data.intra_id}
                                </div>
                                <div class="card-text tp-rs-card-title default-container col">
                                    ${data.win_count}
                                </div>
                            </div>
                        </div>
                        <div class="tp-pf-ht-blank"></div>
                    `
                ).join("");
    
            const cardBody = this.$element.querySelector(".tp-rs-card-container");
            cardBody.innerHTML = playersCard;

            const ranks = this.$element.querySelectorAll(".tp-rs-rank");
            ranks.forEach(rank => {
                if (rank.textContent.trim() === "1") {
                    rank.parentElement.parentElement.classList.add("record-user-box-section", "record-win", "tp-rs-record-win", "tp-rs-winner");
                }
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
