import { getCurrentLanguage } from "../utils/languageUtils";
import locales from "../utils/locales/locales";

function Loading($container) {
    this.$container = $container;

    this.setState = () => {
        this.render();
    };

    this.render = () => {
        const language = getCurrentLanguage();
        const locale = locales[language] || locales.en;

        this.$container.innerHTML = `
      <div class="container tp-color-secondary">
        <div class="default-container h2">Loading</div>
		<button id="backBtn" class="btn tp-btn-primary">${locale.loading.back}</button>
      </div>
    `;
    };

    this.render();
}

export default Loading;
