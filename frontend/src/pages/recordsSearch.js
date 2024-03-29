import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";
import { $ } from "../utils/querySelector.js";

function RecordsSearch({ initialState }) {
    this.state = initialState;
    this.$element = document.createElement("div");
    this.$element.className = "content";

    this.setState = (content) => {
        this.state = content;
        this.render();
    };

    const formatDateTime = (isoDateTimeString) => {
        const date = new Date(isoDateTimeString);
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
        const day = date.getUTCDate().toString().padStart(2, "0");
        const hours = date.getUTCHours().toString().padStart(2, "0");
        const minutes = date.getUTCMinutes().toString().padStart(2, "0");

        return `${year} ${month} ${day} ${hours}:${minutes}`;
    };

    window.addEventListener("resize", function () {
        const windowWidth = window.innerWidth;
        const fontSize = windowWidth * 0.08;

        document.documentElement.style.setProperty(
            "--font-size",
            `${fontSize}px`
        );
    });

    window.dispatchEvent(new Event("resize"));

    const gameLogs = [
        {
            game_id: "1",
            start_time: "2024-03-04T12:00:00Z",
            end_time: "2024-03-04T12:30:00Z",
            winner: "Winner1",
            loser: "Loser1",
        },
        {
            game_id: "2",
            start_time: "2024-03-04T13:00:00Z",
            end_time: "2024-03-04T13:30:00Z",
            winner: "Winner2",
            loser: "Loser2",
        },
        {
            game_id: "3",
            start_time: "2024-03-04T13:00:00Z",
            end_time: "2024-03-04T13:30:00Z",
            winner: "Winner3",
            loser: "Loser3",
        },
        {
            game_id: "4",
            start_time: "2024-03-04T13:01:00Z",
            end_time: "2024-03-04T13:30:00Z",
            winner: "Winner4",
            loser: "Loser4",
        },
        {
            game_id: "5",
            start_time: "2024-03-04T13:02:00Z",
            end_time: "2024-03-04T13:30:00Z",
            winner: "Winner4",
            loser: "Loser4",
        },
        {
            game_id: "6",
            start_time: "2024-03-04T13:03:00Z",
            end_time: "2024-03-04T13:30:00Z",
            winner: "Winner4",
            loser: "Loser4",
        },
        {
            game_id: "7",
            start_time: "2024-03-04T13:04:00Z",
            end_time: "2024-03-04T13:30:00Z",
            winner: "Winner4",
            loser: "Loser4",
        },
    ];

    this.render = () => {
        const language = getCurrentLanguage();
        const locale = locales[language] || locales.en;

        const gameElements = gameLogs
            .map(
                (log) => `
          <div class="record-row tp-btn-primary">
              <div class="record-user-box">
                  <div class="record-user-box-section record-win" data-text="WIN">
                      <div class="h2">${log.winner}</div>
                      <div class="h3">Start time : </div>
                  </div>
                  <img src="/public/assets/img/tmpProfile.png" />
              </div>
              <div class="sized-box">
                  <div class="h2">VS</div>
                  <div class="fs-6 tp-color-primary text-border">${formatDateTime(
                      log.start_time
                  )}</div>
              </div>
              <div class="record-user-box">
                <img src="/public/assets/img/tmpProfile.png" />
                  <div class="record-user-box-section record-lose" data-text="LOSE">
                      <div class="h2">${log.loser}</div>
                      <div class="fs-6">Test Text</div>
                  </div>
              </div>
          </div>
          <div class="sized-box"></div>
      `
            )
            .join("");

        this.$element.innerHTML = `
          <div class="content default-container">
              <div class="h1" style="color:white;">${locale.records.mainText}</div>
              <div class="sized-box"></div>
              <div class="record-container">
				${gameElements}
			  </div>
          </div>
      `;
    };

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

    window.addEventListener("languageChange", function() {
        this.render();
      }.bind(this));
      
    this.init();
}

export default RecordsSearch;
