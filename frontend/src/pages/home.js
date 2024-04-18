import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";

function Home($container) {
    this.$container = $container;
    this.$chartCanvas = null;
    this.myChart = null;

    this.setState = () => {
        this.render();
    };

    this.render = async () => {
        const language = getCurrentLanguage();
        const locale = locales[language] || locales.en;
        this.$container.innerHTML = `
            <div class="content default-container">
                <div class="sized-box"></div>
                <div class="sized-box"></div>
            </div>
        `;
    };
    this.render();
}

export default Home;
