import { getCurrentLanguage } from "../utils/languageUtils";
import locales from "../utils/locales/locales";

function Loading($container) {
    this.$container = $container;
    let gameIdValue, initSocket = null;

    this.setState = () => {
        this.render();
    };

    this.render = () => {
        const language = getCurrentLanguage();
        const locale = locales[language] || locales.en;

        this.$container.innerHTML = `
          <div class="content container tp-color-secondary">
            <div class="default-container h2">Loading</div>
            <button id="backBtn" class="btn tp-btn-primary">${locale.loading.back}</button>
          </div>
        `;

        const backBtn = document.getElementById("backBtn");
        backBtn.addEventListener("click", (event) => {
          event.preventDefault();
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
            window.removeEventListener("popstate", closeSocket);
        }
        window.addEventListener("popstate", closeSocket);

      const idSocketConnect = (event) => {
        initSocket.close();
        let data = JSON.parse(event.data);
        gameIdValue = data.game_id;
        // 현재 연결된 소켓을 세션 스토리지에 저장합니다.
        sessionStorage.setItem("idValue", gameIdValue);
        sessionStorage.setItem("gameMode", "general_game");

        targetURL = `https://${process.env.BASE_IP}/general_game/${gameIdValue}`;
        navigate(targetURL);
    };
    };

    this.render();
}

export default Loading;
