import { $ } from "../utils/querySelector.js";
import renderMyInfoForm from "../component/myInfo.js";
import renderFriendList from "../component/friendList.js";
import { 
  fetchUser,
  fetchMyIntraId,
  fetchAllFriends,
 } from "../utils/fetches.js";
 import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";

function Profile({ initialState }) {
    this.state = initialState;
    this.$element = document.createElement("div");
    this.$element.className =
        "content default-container tp-sl-card-content tp-pf-content";

    const setState = (content, formContainer, flag) => {
      if (flag === "my")
      {
        renderMyInfoForm(content, formContainer);
      }
      else if (flag === "friends")
      {
        renderFriendList(content, formContainer);
      }
    };

    this.render = () => {
        const language = getCurrentLanguage();
        const locale = locales[language] || locales.en;

        this.$element.innerHTML = `
          <div class="card tp-sl-card-content-child tp-pf-card-content-child tp-bgc-secondary default-container">
            <div class="card-header tp-pf-nav-container default-container">
              <ul class="nav nav-underline tp-pf-nav-tabs row" id="profile-tab">
                <li class="nav-item tp-pf-nav-item col" role="presentation">
                  <button class="nav-link tp-pf-nav-link default-container active" id="profile-tab" data-bs-toggle="tab" data-bs-target="#my" type="button" role="tab" aria-controls="my" aria-selected="true" value="my">${locale.profileTab.myInfoTab}</button>
                </li>
                <li class="nav-item tp-pf-nav-item col" role="presentation">
                  <button class="nav-link tp-pf-nav-link default-container" id="profile-tab" data-bs-toggle="tab" data-bs-target="#friends" type="button" role="tab" aria-controls="friends" aria-selected="false" value="friends">${locale.profileTab.friendListTab}</button>
                </li>
              </ul>
            </div> 
            <div class="card-body tp-sl-card-container tp-pf-card-container default-container text-center tp-pf-form-container"></div>
            <div id="profile-modal"></div>
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

        /**
         * Tab Event
         */
        const triggerTabList = document.querySelectorAll('#profile-tab button');
        const formContainer = $(".tp-pf-form-container");

        triggerTabList.forEach(triggerEl => {
          const tabTrigger = new bootstrap.Tab(triggerEl);
          tabTrigger.value = triggerEl.value;
          if (tabTrigger.value === "my") {
            tabTrigger.renderForm = async function() {
              let data = await fetchUser();
              setState(data[0], formContainer, tabTrigger.value);
            };
          }
          else if (tabTrigger.value === "friends") {
            tabTrigger.renderForm = async function() {
              let myIntraId = await fetchMyIntraId();
              let data = await fetchAllFriends(myIntraId);
              setState(data, formContainer, tabTrigger.value);
            };
          }

          triggerEl.addEventListener('click', event => {
            event.preventDefault();
            tabTrigger.renderForm();
          })
        });

        const firstTab = $('#profile-tab button[data-bs-target="#my"]');
        if (firstTab) {
            firstTab.classList.add("active");
            firstTab.dispatchEvent(new Event('click'));
        }
    };

    window.addEventListener("languageChange", function() {
      console.log("HELLO!");
      this.render();
    }.bind(this));

    this.init();
}

export default Profile;
