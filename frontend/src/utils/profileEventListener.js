import { $ } from "../utils/querySelector.js";
import { 
	fetchMyIntraId,
	fetchModifyMyInfoRequest,
	fetchAcceptFriendRequest,
  fetchRefuseFriendRequest,
} from "./fetches.js";
import renderRequestModal from "../component/requestModal.js";
import renderModifyFormModal from "../component/myInfoModifyModal.js";

/**
 * 내 정보 관련 이벤트 함수
 */
export function addMyInfoEventListener(myInfo) {


	const profileModal = $("#profile-modal");
	const callModifyFormBtn = $(".tp-pf-modify-btn");
	if (callModifyFormBtn) {
		callModifyFormBtn.addEventListener("click", (event) => {
			event.preventDefault();
			renderModifyFormModal(myInfo, profileModal);
		});
	}

	const modifyImageBtn = $(".tp-pf-changeImage-button");
	if (modifyImageBtn) {
		modifyImageBtn.addEventListener("click", (event) => {
			event.preventDefault();
			
		});
	}
}



/**
 * 친구목록 관련 이벤트 함수
 */
export function addFriendListEventListener() {

	// Button Tooltip
	const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
	tooltips.forEach(tooltip => {
		new bootstrap.Tooltip(tooltip);
	});


	// ACCEPT/REFUSE Confirm Modal
	const profileModal = document.querySelector("#profile-modal");
	const acceptBtns = document.querySelectorAll('.tp-fl-accept-btn');
	acceptBtns.forEach(button => {
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			const requestId = event.target.closest("tr").querySelector(".tp-fl-request-id").value;
			console.log("tp-fl-accept-btn click event", requestId);
			renderRequestModal("ACCEPT", profileModal, requestId);
		});
	});

	const refuseBtns = document.querySelectorAll('.tp-fl-refuse-btn');
	refuseBtns.forEach(button => {
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			const requestId = event.target.closest("tr").querySelector(".tp-fl-request-id").value;
			console.log("tp-fl-refuse-btn click event", requestId);
			renderRequestModal("REFUSE", profileModal, requestId);
		});
	});


	// Friends ON/OFFLINE Indicator
	const onoffIndicators = document.querySelectorAll(".online-indicator");
	onoffIndicators.forEach(indicator => {
		if (indicator.children[1].value === "0") { //"0" : 오프라인, "1" : 온라인
			const indicatorContainer = indicator.children[0];
			indicatorContainer.classList.add("tp-online-indicator-off");
		}
	});


	// Friend List Button Hidden & Control Display IntraID
	const friendBtnGrps = document.querySelectorAll(".tp-fl-btn-group");
	friendBtnGrps.forEach(async friendBtnGrp => {
		const statusValue = friendBtnGrp.children[2].value;
		const requestUserId = friendBtnGrp.closest("tr").querySelector(".tp-fl-request-intra-id").value;
		const responseUserId = friendBtnGrp.closest("tr").querySelector(".tp-fl-response-intra-id").value;
		const displayIntraIdElem = friendBtnGrp.closest("tr").querySelector(".tp-fl-display-intra-id");


		const myIntraId = await fetchMyIntraId();
		if (statusValue === "0" && myIntraId === requestUserId) { // "0" : pending, "1" : accepted
			friendBtnGrp.classList.add("visually-hidden");          // 친구 신청 발신자에게는 친구 신청 상태가 보임
			friendBtnGrp.parentElement.innerText = "Waiting for accept";
		}
		else if (statusValue === "1") {
			friendBtnGrp.children[0].classList = "visually-hidden";                 // 이미 친구인 경우 친구 수락 버튼이 안 보임
			friendBtnGrp.parentElement.parentElement.classList.add("tp-fl-friend"); // 이미 친구인 경우 CSS 효과
		}

		if (myIntraId === requestUserId) {
			displayIntraIdElem.innerText = responseUserId;
		} else {
			displayIntraIdElem.innerText = requestUserId;
		}
	});
}



/**
 * 프로필 페이지 모달창 관련 이벤트 함수(내 정보/친구 목록)
 */
export function addProfileModalEventListener(profileModal) {
	const closeProfileModal = (profileModal) => {
			profileModal.style.display = "none";
	};

	const closeButtons = profileModal.querySelectorAll("#close-btn");
	if (closeButtons)
	{
		closeButtons.forEach(button => {
			button.addEventListener("click", () => {
					closeProfileModal(profileModal);
			});
		});
	}

	const acceptModalButton = profileModal.querySelector(".tp-fl-accept-modal-btn");
	if (acceptModalButton) {
		acceptModalButton.addEventListener("click", () => {
			fetchAcceptFriendRequest(requestId);
			closeProfileModal(profileModal);
		});
	}

	const refuseModalButton = profileModal.querySelector(".tp-fl-refuse-modal-btn");
	if (refuseModalButton) {
		refuseModalButton.addEventListener("click", () => {
			fetchRefuseFriendRequest(requestId);
			closeProfileModal(profileModal);
		});
	}

	const imageModifyButton = profileModal.querySelector(".tp-pf-changeImage-button");
	if (imageModifyButton) {
		imageModifyButton.addEventListener("click", (event) => {
			event.preventDefault();
			console.log("PHOTO!");
		});
	}

	const modifyForm = profileModal.querySelector(".tp-pf-form-myinfo-update");
	if (modifyForm) {
		modifyForm.addEventListener("submit", (event) => {
			event.preventDefault();
			const myData = new FormData(modifyForm);
			for (let pair of myData.entries()) {
				console.log(pair[0] + ': ' + pair[1]);
			}
			fetchModifyMyInfoRequest(myData);
			closeProfileModal(profileModal);
		});
	}
}