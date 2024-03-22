import { $ } from "../utils/querySelector.js";
import renderMyInfoForm from "../component/myInfo.js";
import renderFriendList from "../component/friendList.js";
import renderRequestModal from "../component/requestModal.js";
import tmpData from "../utils/tmpData.js";

function Profile({ initialState }) {
    this.state = initialState;
    this.$element = document.createElement("div");
    this.$element.className =
        "content default-container tp-sl-card-content tp-pf-content";

    const fetchUser = async () => {
      try {
          //TODO - API /me 로 수정 예정
          // const nickname = $(".tp-pf-input-nickname");
          // const response = await fetch("http://127.0.0.1:8000/api/v1/users/" + nickname);
          const response = await fetch("http://127.0.0.1:8000/api/v1/users/" + "yunjcho", {
              credentials: 'include'
          });

          const data = await response.json();

          //TODO - API UUID -> Nickname 변경 후 아래 코드 수정
          setState(data[0], "MY");
      } catch (error) {
          console.error("Error fetching user data:", error);
      }
    };

    //TODO - 추후 API 수정 예정
    const fetchFriends = async() => {
      try {
        //TODO - API UUID -> Nickname 변경 후 아래 코드 복원
        // const nickname = $(".tp-pf-input-nickname");
        const response = await fetch("http://127.0.0.1:8000/api/v1/friend_requests/" + "yunjcho" + "/all", {
          credentials: 'include'
        });
        
        const data = await response.json();
        console.log("fetchFriends()", data);
        
        const tmpDatas = tmpData();
        const tmpSample = [ ...data, ...tmpDatas];
        tmpSample.sort((a, b) => {
          if (a.friend_status !== b.friend_status) {
              return a.friend_status - b.friend_status;
          } else {
              return b.status - a.status;
          }
        });

        //TODO - API UUID -> Nickname 변경 후 아래 코드 수정
        setState(tmpSample, "FRIENDS");

      } catch (error) {
          console.error("Error fetching friends data:", error);
      }
    };

    const renderUser = (user) => {
      let nickname = $(".tp-pf-input-nickname");
      let intraId = $(".tp-pf-input-intraId");
      let profileImg = $(".tp-pf-photo-thumnail");
      let record = $(".tp-pf-input-record");
      nickname.value = user.nickname;
      intraId.value = user.intra_id;
      profileImg.src = "http://127.0.0.1:8000" + user.profile_image;
      record.value = user.win_count + " WIN, " + user.lose_count + " LOSE";
    };

    const renderFriends = (users) => {
      let contentHTML = "";
      if (users.length === 20) {
        contentHTML += `
          <tr>
            <td colspan='5'>친구가 없습니다</td>
          </tr>
          <tr style="height:3px;"></tr>
        `;
      }
      const tableRows = users
      .map(
          (data, index) => {
            let rowHTML = `
              <tr>
                  <td class="h3 bold text-center align-middle col-1">${
                      index + 1
                  }</td>
                  <td class="text-center align-middle col-1">
                    <div class="tp-fl-profile">
                      <img style="width:80%;" src=${data.profile_image} onerror="this.onerror=null; this.src='../../public/assets/img/sharkcookie.png'"></img>
                    </div>
                  </td>
                  <td class="h3 text-left align-middle col-2">${
                      data.nickname
                  }</td>
                  <td class="h3 bold text-center align-middle col-1 tp-onoff-status">
                    <div class="online-indicator">
                      <span class="blink tp-online-indicator-blink"></span>
                      <input type="hidden" class="tp-online-indicator-value" value=${data.status}></input>
                    </div>
                  </td>
                  <td class="h3 bold text-center align-middle col-1">
                    <div class="tp-pf-btn-group d-grid gap-2 d-md-flex tp-fl-btn-group">
                      <div class="tp-sl-btn-parent default-container">
                        <button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-accept-btn card default-container h-100 tp-fl-btn" value="ACCEPT" 
                          data-bs-toggle="tooltip" title="Accept"> 
                          <div class="card-body default-container ">
                            <h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✔︎</h5>
                          </div>
                        </button>
                      </div>
                      <div class="tp-sl-btn-parent default-container">
                        <button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-refuse-btn card default-container h-100 tp-fl-btn" value="REFUSE"
                          data-bs-toggle="tooltip" title="Refuse"> 
                          <div class="card-body default-container ">
                            <h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✗</h5>
                          </div>
                        </button>
                      </div>
                      <input type="hidden" class="tp-online-indicator-value" value=${data.friend_status}></input>
                    </div>
                  </td>
              </tr>
              <tr style="height:3px;"></tr>
          `;
          return rowHTML;
        });
        contentHTML += tableRows.join("");

      const tableBody = this.$element.querySelector("tbody");
      if (tableBody) {
        tableBody.innerHTML = contentHTML;

        const onoffIndicators = this.$element.querySelectorAll(".online-indicator");
        onoffIndicators.forEach(indicator => {
          if (indicator.children[1].value === "0") { //"0" : 오프라인, "1" : 온라인
            const indicatorContainer = indicator.children[0];
            indicatorContainer.classList.add("tp-online-indicator-off");
          }
        });

        const friendStatus = this.$element.querySelectorAll(".tp-fl-btn-group");
        friendStatus.forEach( status => {
          if (status.children[2].value === "1") { //"0" : pending, "1" : accept
            status.children[0].classList = 'visually-hidden';
            status.parentElement.parentElement.classList.add("tp-fl-friend");
          }
        });
      }

      const tooltips = this.$element.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltips.forEach(tooltip => {
          new bootstrap.Tooltip(tooltip);
      });


      const profileModal = document.querySelector("#profile-modal");
      const acceptBtns = this.$element.querySelectorAll('.tp-fl-accept-btn');
      acceptBtns.forEach(button => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          renderRequestModal("ACCEPT", profileModal);
        });
      });

      const refuseBtns = this.$element.querySelectorAll('.tp-fl-refuse-btn');
      refuseBtns.forEach(button => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          renderRequestModal("REFUSE", profileModal);
        });
      });
    }

    const setState = (content, flag) => {
      if (flag === 'MY')
      {
        renderUser(content);
      }
      else if (flag === 'FRIENDS')
      {
        renderFriends(content);
      }
    };

    this.render = () => {
        this.$element.innerHTML = `
          <div class="card tp-sl-card-content-child tp-pf-card-content-child tp-bgc-secondary default-container">
            <div class="card-header tp-pf-nav-container default-container">
              <ul class="nav nav-underline tp-pf-nav-tabs row" id="profile-tab">
                <li class="nav-item tp-pf-nav-item col" role="presentation">
                  <button class="nav-link tp-pf-nav-link default-container active" id="profile-tab" data-bs-toggle="tab" data-bs-target="#my" type="button" role="tab" aria-controls="my" aria-selected="true" value="my">MY</button>
                </li>
                <li class="nav-item tp-pf-nav-item col" role="presentation">
                  <button class="nav-link tp-pf-nav-link default-container" id="profile-tab" data-bs-toggle="tab" data-bs-target="#friends" type="button" role="tab" aria-controls="friends" aria-selected="false" value="friends">FRIENDS</button>
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
         * Button Event
         */
        // const modifyBtn = $(".tp-pf-modify-btn");

        // if (modifyBtn) {
        //     modifyBtn.addEventListener("click", (event) => {
        //         event.preventDefault();
        //         this.renderForm("UPDATE");
        //         this.fetchUser();
        //     });
        // }

        // const submitBtn = $(".tp-pf-submit-btn");
        // const cancleBtn = $(".tp-pf-cancle-btn");

        // if (submitBtn) {
        //     submitBtn.addEventListener("click", (event) => {
        //         event.preventDefault();
        //         console.log("REQUEST POST");
        //     });
        // }
        // if (cancleBtn) {
        //     cancleBtn.addEventListener("click", (event) => {
        //         event.preventDefault();
        //         console.log("REQUEST GET");
        //         this.renderForm("MY");
        //     });
        // }

        /**
         * Tab Event
         */
        const triggerTabList = document.querySelectorAll('#profile-tab button');
        const formContainer = $(".tp-pf-form-container");

        triggerTabList.forEach(triggerEl => {
          const tabTrigger = new bootstrap.Tab(triggerEl);
          if (triggerEl.value === 'my') {
            tabTrigger.value = 'my';
            tabTrigger.renderForm = function() {
              formContainer.innerHTML = renderMyInfoForm();
              fetchUser();
            };
          }
          else if (triggerEl.value === 'friends') {
            tabTrigger.value = 'friends';
            tabTrigger.renderForm = function() {
              fetchFriends();
              formContainer.innerHTML = renderFriendList();
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

    this.init();
}

export default Profile;
