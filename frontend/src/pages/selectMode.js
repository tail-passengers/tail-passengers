import { $ } from "../utils/querySelector.js";
import { BASE_URL } from "../utils/routeInfo.js";
import { navigate } from "../utils/navigate.js";

function SelectMode({ initialState }) {
    this.state = initialState;
    this.$element = document.createElement("div");
    this.$element.className = "content default-container tp-sl-card-content";

    this.setState = (content) => {
        this.state = content;
        this.render();
    };

    this.render = () => {
        this.$element.innerHTML = `
      <div class="tp-sl-card-content-child">
        <div class="tp-sl-title-container default-container text-center tp-color-secondary">
          <h1>Please choose the mode!</h1>
        </div> 
        <div class="tp-sl-card-container default-container text-center">
          <form class="tp-sl-card-row tp-sl-card-row-height row g-2">
            <div class="tp-sl-btn-parent col">
                <button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-single-btn card h-100" value="/game"> 
                  <div class="card-body row">
                    <div></div>
                    <h5 class="tp-sl-card-title default-container">Single Mode</h5>
                    <p class="tp-sl-card-text default-container">Playing games alone</p>
                  </div>
                </button>
            </div>
            <div class="tp-sl-btn-parent col">
                <button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-sl-multi-btn card h-100" value="/sockettest">
                  <div class="card-body row">
                    <div></div>
                    <h5 class="tp-sl-card-title default-container">Multi Mode</h5>
                    <p class="tp-sl-card-text default-container">Playing games with others</p>
                  </div>
                </button>
            </div>
          </form>
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

        //TODO start - test용, 추후 삭제 또는 수정
        const singleBtn = $(".tp-sl-single-btn");
        const multiBtn = $(".tp-sl-multi-btn");

        if (singleBtn) {
            singleBtn.addEventListener("click", function (event) {
                event.preventDefault();
                const targetURL = BASE_URL + this.value;
                console.log("targetURL", targetURL);
                navigate(targetURL);
            });
        }

        if (multiBtn) {
            multiBtn.addEventListener("click", function (event) {
                event.preventDefault();
                const targetURL = BASE_URL + this.value;
                navigate(targetURL);
            });
        }
        //TODO end
    };

    this.init();
}

export default SelectMode;
