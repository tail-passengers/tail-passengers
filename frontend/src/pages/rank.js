import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";
import { $ } from "../utils/querySelector.js";
import {
  fetchMyIntraId,
  fetchRequestFriend,
  fetchAllFriends,
  fetchUsers,
} from "../utils/fetches.js";
import { replaceHttpWithHttps } from "../utils/imageUpload.js";

function Rank({ initialState }) {
  this.state = initialState;
  this.$element = document.createElement("div");
  this.$element.className = "content";

  this.renderUsers = async (locale) => {
    const users = await fetchUsers();
    const tableRows = users
      .map(
        (data, index) => `
                    <tr>
                        <td class="text-center align-middle col-1">${
                          index + 1
                        }</td>
                        <td class="text-center align-middle col-2"><img style="width:100px; height:100px;" src="${replaceHttpWithHttps(
                          data.profile_image
                        )}"></img></td>
                        <td class="text-center align-middle col-2">${
                          data.nickname
                        }</td>
                        <td class="text-center align-middle col-2 user_intra_id" > ${
                          data.intra_id
                        }</td>
                        <td class="text-center align-middle">${
                          data.win_count
                        }</td>
                        <td class="text-center align-middle">${
                          data.lose_count
                        }</td>
                        <td class="text-center align-middle">${
                          data.win_count - data.lose_count
                        }</td>
                        <td class="text-center align-middle tp-rank-friend-btn">
                            <div class="tp-pf-btn-group d-grid gap-2 d-md-flex tp-fl-btn-group">
                                <div class="tp-sl-btn-parent default-container">
                                    <button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-request-btn card default-container h-100 tp-fl-btn" value="REQUEST" 
                                        data-bs-toggle="tooltip" title="${
                                          locale.rank.tooltipRequest
                                        }"> 
                                        <div class="card-body default-container">
                                        <h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✚</h5>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr style="height:3px;"></tr>
                `
      )
      .join("");

    const tableBody = this.$element.querySelector("tbody");
    tableBody.innerHTML = tableRows;

    const requestButtons = this.$element.querySelectorAll(".tp-fl-request-btn");
    const requestUserId = await fetchMyIntraId();
    const friendList = await fetchAllFriends(requestUserId);
    requestButtons.forEach((button) => {
      const userElem = button.closest("tr").querySelector(".user_intra_id");
      const responseUserId = userElem.textContent.trim();

      /** 이미 친구인 유저의 친구 신청 버튼 비활성화 */
      friendList.forEach((friend) => {
        if (
          friend.request_intra_id === responseUserId ||
          friend.response_intra_id === responseUserId
        ) {
          button.classList.add("visually-hidden");
        }
      });

      /** 나에 대한 친구 신청 버튼 비활성화 */
      if (requestUserId === responseUserId) {
        button.classList.add("visually-hidden");
      }

      button.addEventListener("click", (event) => {
        fetchRequestFriend(requestUserId, responseUserId);
        this.render();
      });
    });
  };

  this.setState = (content, locale) => {
    this.state = content;
    this.renderUsers(locale);
  };

  this.render = () => {
    const language = getCurrentLanguage();
    const locale = locales[language] || locales.en;
    this.$element.innerHTML = `
            <div class="content default-container">
                <div class="container">
                    <div class="mb-3 mt-3">
                        <div class="h1 text-left tp-color-secondary">${locale.rank.mainText}</div>
                        <div class="text-left tp-color-primary">${locale.rank.subText}</div>
                    </div>
                    <div class="row justify-content-center default-container">
                        <div class="tp-sl-card-row">
                            <div class="table-responsive" style="opacity:100%">
                                <table class="table table-dark table-responsive-md" style="border-spacing: 0 10px;">
                                    <thead>
                                        <tr class="text-center align-middle">
                                            <th class="tp-bgc-secondary">${locale.rank.thRank}</th>
                                            <th class="tp-bgc-secondary">${locale.rank.thUserProfile}</th>
                                            <th class="tp-bgc-secondary">${locale.rank.thNickname}</th>
                                            <th class="tp-bgc-secondary">${locale.rank.thUserIntraId}</th>
                                            <th class="tp-bgc-secondary">${locale.rank.thWins}</th>
                                            <th class="tp-bgc-secondary">${locale.rank.thLoses}</th>
                                            <th class="tp-bgc-secondary">${locale.rank.thRankPoint}</th>
                                            <th class="tp-bgc-secondary">${locale.rank.thFriendRequestBtn}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <!-- 여기에 테이블 행이 들어갈 것입니다 -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    this.renderUsers(locale);
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

export default Rank;
