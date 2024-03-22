import { $ } from "../utils/querySelector.js";

function AboutUs({ initialState }) {
    this.state = initialState;
    this.$element = document.createElement("div");
    this.$element.className = "content";

    this.setState = (content) => {
        this.state = content;
        this.render();
    };

    this.render = () => {
        this.$element.innerHTML = `
          <div class="content default-container text-center tp-color-secondary ">
            <div>
              <div class="aboutus-title-container">
                <div class="h2">
                    About Us Page
                </div>
                <div>
                  안녕하세요. 저희는 트센 테일-페센저 팀입니다.
                </div>
              </div>
            </div>
            <div class="sized-box"></div>
            <div class="h2 aboutus-subtitle-container tp-color-primary">Our Team</div>
            <div class ="sized-box"></div>
            <div style="width:95%">
              <div class = "row">
                <div class="col aboutus-profile-card">
                  <img class="aboutus-profile-img-box" src="../../public/assets/img/tmpProfile.png">
                  <div class="h3">jaekkang</div>
                  <div class="h4">안녕하세요. 반갑습니다.</div>
                </div>
                <div class="col aboutus-profile-card">
                  <img class="aboutus-profile-img-box" src="../../public/assets/img/tmpProfile.png">
                  <div class="h3">jaekkang</div>
                  <div class="h4">안녕하세요. 반갑습니다.</div>
                </div>
                <div class="col aboutus-profile-card">
                  <img class="aboutus-profile-img-box" src="../../public/assets/img/tmpProfile.png">
                  <div class="h3">jaekkang</div>
                  <div class="h4">안녕하세요. 반갑습니다.</div>
                </div>
              </div>
              <div class ="sized-box"></div>
              <div class = "row d-flex justify-content-center align-center">
                <div class="col aboutus-profile-card">
                  <img class="aboutus-profile-img-box" src="../../public/assets/img/tmpProfile.png">
                  <div class="h3">jaekkang</div>
                  <div class="h4">안녕하세요. 반갑습니다.</div>
                </div>
                <div class="col aboutus-profile-card">
                  <img class="aboutus-profile-img-box" src="../../public/assets/img/tmpProfile.png">
                  <div class="h3">jaekkang</div>
                  <div class="h4">안녕하세요. 반갑습니다.</div>
                </div>
              </div>
              <div class="sized-box"></div>
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
    this.init();
}

export default AboutUs;
