import { fetchGameLogs } from "../utils/fetches.js";
import { replaceHttpWithHttps } from "../utils/imageUpload.js";
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
			const options = {
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
					timeZone: "Asia/Seoul" // 한국 시간대를 지정합니다.
			};
			return date.toLocaleString("ko-KR", options);
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

    this.render = async () => {
        const language = getCurrentLanguage();
        const locale = locales[language] || locales.en;

        const gameLogs = await fetchGameLogs();
				
				console.log("time", gameLogs[0].start_time);
        const gameElements = gameLogs
				.map(
					(log) => `
          <div class="record-row tp-btn-primary">
              <div class="record-user-box">
                  <div class="record-user-box-section record-win" data-text="WIN">
                      <div class="h2">${log.player1.nickname}</div>
                  </div>
                  <img src=${replaceHttpWithHttps(log.player1.profile_image)} style="width:80px; height:80px;"/>
              </div>
              <div class="sized-box">
                  <div class="h2">${locale.records.vs}</div>
                  <div class="fs-6 tp-color-primary text-border">${formatDateTime(
                      log.start_time
                  )}</div>
              </div>
              <div class="record-user-box">
                <img src=${replaceHttpWithHttps(log.player2.profile_image)} style="width:80px; height:80px;" />
                  <div class="record-user-box-section record-lose" data-text="LOSE">
                      <div class="h2">${log.player2.nickname}</div>
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

    window.addEventListener("languageChange", () => {
        this.render();
    });

    this.init();
}

export default RecordsSearch;
