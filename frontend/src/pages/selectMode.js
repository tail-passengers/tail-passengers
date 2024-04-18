import { $ } from "../utils/querySelector.js";
import { navigate } from "../utils/navigate.js";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";

function SelectMode({ initialState }) {
  let targetURL;
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
    $("#nav-bar").hidden = false;

    this.$element.innerHTML = `
      <div class="tp-sl-card-content-child">
   <div class="tp-sl-title-container default-container text-center tp-color-secondary tp-sl-card-header">
      <h1>${locale.selectMode.welcome}</h1>
      <div class="tp-sl-info-text tp-sl-card-header tp-sl-info-text">
         <p class= "tp-sl-card-header">
            ${locale.selectMode.info1}<br>
            ${locale.selectMode.info2}<br>
            ${locale.selectMode.info3}<br>
						<br>
            ${locale.selectMode.info4}<br>
         </p>
      </div>
   </div>
   <div class="tp-sl-title-container default-container text-center tp-color-secondary tp-sl-card-header">
      <h1>${locale.selectMode.mainText}</h1>
   </div>
   <div class="tp-sl-card-container default-container text-center">
      <form class="tp-sl-card-row tp-sl-card-row-height row g-2">
         <div class="tp-sl-btn-parent col">
            <button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-single-btn card h-100" value="game">
               <div class="card-body row">
                  <h5 class="tp-sl-card-title default-container">${locale.selectMode.singleMode}</h5>
                  <p class="tp-sl-card-text default-container">${locale.selectMode.singleModeDesc}</p>
               </div>
            </button>
         </div>
         <div class="tp-sl-btn-parent col">
            <button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-multi-btn card h-100" value="sockettest">
               <div class="card-body row">
                  <h5 class="tp-sl-card-title default-container">${locale.selectMode.multiMode}</h5>
                  <p class="tp-sl-card-text default-container">${locale.selectMode.multiModeDesc}</p>
               </div>
            </button>
         </div>
         <div class="tp-sl-btn-parent col">
            <button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-tournament-btn card h-100" value="tournament">
               <div class="card-body row">
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
        navigate(targetURL);
      });
    }
    if (tournamentBtn) {
      tournamentBtn.addEventListener("click", function (event) {
        event.preventDefault();
        targetURL = `https://${process.env.BASE_IP}/${this.value}`;
        navigate(targetURL);
      });
    }

    if (multiBtn) {
      multiBtn.addEventListener("click", function (event) {
        event.preventDefault();
        targetURL = `https://${process.env.BASE_IP}/loading`;
        navigate(targetURL);
      });
    }
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
      canvas.parentNode.removeChild(canvas);
    }
    this.render();
  };

  this.init();
}

export default SelectMode;
