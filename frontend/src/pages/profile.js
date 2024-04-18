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
import { deleteIntervalId } from "../utils/profileEventListener.js";
import { navigate } from "../utils/navigate.js";


function Profile({ initialState }) {
		this.state = initialState;
		this.$element = document.createElement("div");
		this.$element.className =
				"content default-container tp-sl-card-content tp-pf-content";

		const setState = (content, formContainer, flag) => {
				deleteIntervalId();
				if (flag === "my") {
						renderMyInfoForm(content, formContainer);
				} else if (flag === "friends") {
						const intervalId = renderFriendList(content, formContainer);
						localStorage.setItem('intervalId', intervalId);
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
									<button class="nav-link tp-pf-nav-link tp-pf-tab-btn default-container active" data-bs-toggle="tab" data-bs-target="#my" type="button" role="tab" aria-controls="my" aria-selected="true" value="my">${locale.profileTab.myInfoTab}</button>
								</li>
								<li class="nav-item tp-pf-nav-item col" role="presentation">
									<button class="nav-link tp-pf-nav-link tp-pf-tab-btn default-container" data-bs-toggle="tab" data-bs-target="#friends" type="button" role="tab" aria-controls="friends" aria-selected="false" value="friends">${locale.profileTab.friendListTab}</button>
								</li>
							</ul>
						</div> 
						<div class="card-body tp-sl-card-container tp-pf-card-container default-container text-center tp-pf-form-container"></div>
						<div id="profile-modal"></div>
					</div>
				`;
				renderTab();
		};

		const renderTab = () => {
				const triggerTabList = document.querySelectorAll(".tp-pf-tab-btn");
				const formContainer = $(".tp-pf-form-container");
				const formBody = $(".tp-pf-form");
				if (formBody) {
						formContainer.removeChild(formBody);
				}
				triggerTabList.forEach((triggerEl) => {
						const contentForm = formContainer.querySelector(".tp-pf-form");
						if (contentForm) {
								formContaine.removeChild(contentForm);
						}
						const tabTrigger = new bootstrap.Tab(triggerEl);
						tabTrigger.value = triggerEl.value;
						if (tabTrigger.value === "my") {
								tabTrigger.renderForm = async function () {
										const data = await fetchUser();
										if (data) {
												setState(data[0], formContainer, tabTrigger.value);
										}
								};
						} else if (tabTrigger.value === "friends") {
								tabTrigger.renderForm = async function () {
										const check = fetchUser();
										if (check === false) {
											deleteCSRFToken();
											navigate("/");
											deleteIntervalId();
										}
										const myIntraId = await fetchMyIntraId();
										const data = await fetchAllFriends(myIntraId);
										if (data) {
												setState(data, formContainer, tabTrigger.value);
										}
								};
						}

						triggerEl.addEventListener("click", (event) => {
								event.preventDefault();
								deleteIntervalId();
								tabTrigger.renderForm();
						});
				});


				const firstTab = $('#profile-tab button[data-bs-target="#my"]');
				if (firstTab) {
						firstTab.classList.add("active");
						firstTab.dispatchEvent(new Event("click"));
				}
		}

		this.init = () => {
				let parent = $("#app");
				const child = $(".content");
				if (parent && child) {
						parent.removeChild(child);
						parent.appendChild(this.$element);
				}
				let body = $("body");
				const canvas = $("canvas");
				if (canvas) {
						body.removeChild(canvas);
				}
				deleteIntervalId();
				this.render();
		};

		window.addEventListener(
				"languageChange",
				function () {
						this.render();
				}.bind(this)
		);

		this.init();
}

export default Profile;
