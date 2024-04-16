import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";
import { addFriendListEventListener } from "../utils/profileEventListener.js";
import { pollingFetches } from "../utils/polling.js";
import { fetchMyIntraId, fetchAllFriends } from "../utils/fetches.js";
import { getCSRFToken } from "../utils/cookie.js";

export default function renderFriendList(content, parentElement) {
    const renderFriendListField = (content, parentElement) => {
        const language = getCurrentLanguage();
        const locale = locales[language] || locales.en;
        let contentHTML = `
			<form class="tp-pf-form tp-pf-form-friends tp-sl-card-row tp-pf-card-row-height default-container row g-2">
				<table class="table table-dark table-hover">
					<thead>
						<tr class="tp-table-tr">
							<th scope="tp-table-th col">${locale.friendList.friendsNumber}</th>
							<th scope="tp-table-th col">${locale.friendList.friendsProfile}</th>
							<th scope="tp-table-th col">${locale.friendList.friendsNickname}</th>
							<th scope="tp-table-th col">${locale.friendList.friendsConnection}</th>
							<th scope="tp-table-th col">${locale.friendList.friendsRequest}</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</form>
		`;
        const prevForm = parentElement.querySelector(".tp-pf-form");
        if (prevForm) {
            parentElement.removeChild(prevForm);
        }
        parentElement.innerHTML = contentHTML;
        renderFriends(content, locale);
        addFriendListEventListener();
    };

    const renderFriends = (users, locale) => {
        if ((users, locale)) {
            let tableHTML = "";
            if (users.length === 0) {
                tableHTML += `
					<tr>
						<td colspan='5'>${locale.friendList.nofriends}</td>
					</tr>
					<tr style="height:3px;"></tr>
				`;
            } else {
                const tableRows = users.map((data, index) => {
                    const imagePath =
                        `https://${process.env.BASE_IP}` +
                        data.friend_requests.profile_image;
                    let rowHTML = `
						<tr>
								<td class="text-center align-middle col-1">
									${index + 1}
									<input type="hidden" class="tp-fl-request-id" value=${data.request_id}></input>
								</td>
								<td class="text-center align-middle col-1">
									<div class="tp-fl-profile">
									<img style="width:80%;" src=${imagePath} onerror="this.onerror=null; this.src='../../public/assets/img/sharkcookie.png'"></img>
									</div>
								</td>
								<td class="text-left align-middle tp-fl-display-intra-id col-2">
										<input type="hidden" class="tp-fl-request-intra-id" value=${
                                            data.request_intra_id
                                        }></input>
										<input type="hidden" class="tp-fl-response-intra-id" value=${
                                            data.response_intra_id
                                        }></input>
								</td>
								<td class="text-center align-middle col-1 tp-onoff-status">
									<div class="online-indicator">
										<span class="blink tp-online-indicator-blink"></span>
										<input type="hidden" class="tp-online-indicator-value" value=${
                                            data.friend_requests.status
                                        }></input>
									</div>
								</td>
								<td class="text-center align-middle col-1">
									<div class="tp-pf-btn-group d-grid gap-2 d-md-flex tp-fl-btn-group">
										<div class="tp-sl-btn-parent default-container">
											<button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-accept-btn card default-container h-100 tp-fl-btn" value="ACCEPT" 
												data-bs-toggle="tooltip" title="${locale.friendList.tooltipAccept}"> 
												<div class="card-body default-container ">
													<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✔︎</h5>
												</div>
											</button>
										</div>
										<div class="tp-sl-btn-parent default-container">
											<button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-refuse-btn card default-container h-100 tp-fl-btn" value="REFUSE"
												data-bs-toggle="tooltip" title="${locale.friendList.tooltipRefuse}"> 
												<div class="card-body default-container">
													<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✗</h5>
												</div>
											</button>
										</div>
										<input type="hidden" class="tp-friend-status" value=${data.status}></input>
									</div>
								</td>
						</tr>
						<tr style="height:3px;"></tr>
					`;
                    return rowHTML;
                });
                tableHTML += tableRows.join("");
            }

            const tableBody = document.querySelector("tbody");
            if (tableBody) {
                tableBody.innerHTML = tableHTML;
            }
        }
    };

	renderFriendListField(content, parentElement);

	window.addEventListener("languageChange", function() {
		const formBody = parentElement.querySelector(".tp-pf-form");
		if (formBody) {
			parentElement.removeChild(formBody);
			renderFriendListField(content, parentElement);
		}
	}.bind(this));
	
	const intervalRenderFriends = async function() {
		const csrfToken = getCSRFToken();
		if (csrfToken !== null) {
			const myIntraId = await fetchMyIntraId();
			const content = await fetchAllFriends(myIntraId);
			renderFriendListField(content, parentElement);
		}
	}
	return pollingFetches(intervalRenderFriends, 3000);
    renderFriendListField(content, parentElement);

    window.addEventListener(
        "languageChange",
        function () {
            const formBody = parentElement.querySelector(".tp-pf-form");
            if (formBody) {
                parentElement.removeChild(formBody);
                renderFriendListField(content, parentElement);
            }
        }.bind(this)
    );

    const intervalRenderFriends = async function () {
        const csrfToken = getCSRFToken();
        if (csrfToken !== null) {
            const myIntraId = await fetchMyIntraId();
            const content = await fetchAllFriends(myIntraId);
            renderFriendListField(content, parentElement);
        }
    };
    pollingFetches(intervalRenderFriends, 3000);
}
