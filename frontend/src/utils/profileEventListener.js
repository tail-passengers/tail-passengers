import { $ } from "./querySelector.js";
import {
	fetchMyIntraId,
	fetchModifyMyInfoRequest,
	fetchAcceptFriendRequest,
	fetchRefuseFriendRequest,
	fetchImageFileRequest,
	fetchUser,
	fetchAllFriends
} from "./fetches.js";
import renderRequestModal from "../component/requestModal.js";
import renderModifyFormModal from "../component/myInfoModifyModal.js";
import { setImageToInput } from "./imageUpload.js";
import renderMyInfoForm from "../component/myInfo.js";
import renderFriendList from "../component/friendList.js";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";

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
export async function addFriendListEventListener(locale) {

	const myIntraId = await fetchMyIntraId();

	// ACCEPT/REFUSE Confirm Modal
	const profileModal = document.querySelector("#profile-modal");
	const acceptBtns = document.querySelectorAll('.tp-fl-accept-btn');
	acceptBtns.forEach(button => {
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			const requestId = event.target.closest("tr").querySelector(".tp-fl-request-id").value;
			renderRequestModal("ACCEPT", profileModal, requestId);
		});
	});

	const refuseBtns = document.querySelectorAll('.tp-fl-refuse-btn');
	refuseBtns.forEach(button => {
		button.addEventListener("click", async (event) => {
			event.preventDefault();
			const requestId = event.target.closest("tr").querySelector(".tp-fl-request-id").value;
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

		if (statusValue === "0" && myIntraId === requestUserId) { // "0" : pending, "1" : accepted
			friendBtnGrp.classList.add("visually-hidden");          // 친구 신청 발신자에게는 친구 신청 상태가 보임
			friendBtnGrp.parentElement.innerText = locale.friendList.waitingMessage;
		}
		else if (statusValue === "1") {
			friendBtnGrp.children[0].classList = "visually-hidden";                 // 이미 친구인 경우 친구 수락 버튼이 안 보임
			friendBtnGrp.parentElement.parentElement.classList.add("tp-fl-friend"); // 이미 친구인 경우 CSS 효과
		}
	});

	const refreshBtn = $(".tp-fl-refresh-btn");
	if (refreshBtn) {
		refreshBtn.addEventListener("click", async (event) => {
			event.preventDefault();
			const friendList = await fetchAllFriends(myIntraId);
			if (friendList) {
				const formContainer = $(".tp-pf-form-container");
				const friendForm = formContainer.querySelector(".tp-pf-form-friends");
				formContainer.removeChild(friendForm);
				renderFriendList(friendList, formContainer);
			}
		});
	}
}



/**
 * 프로필 페이지 모달창 관련 이벤트 함수(내 정보/친구 목록)
 */
export function addProfileModalEventListener(profileModal, flag) {
	const language = getCurrentLanguage();
	const locale = locales[language] || locales.en;
	const closeProfileModal = async (profileModal) => {
		profileModal.style.display = "none";
		const formContainer = $(".tp-pf-form-container");
		const myInfo = await fetchUser();
		if (flag === "MY") {
			renderMyInfoForm(myInfo[0], formContainer);
		} else if (flag === "FRIENDS") {
			const friendsList = await fetchAllFriends(myInfo[0].intra_id);
			renderFriendList(friendsList, formContainer);
		}
	};

	const closeButtons = profileModal.querySelectorAll("#close-btn");
	if (closeButtons) {
		closeButtons.forEach(button => {
			button.addEventListener("click", () => {
				closeProfileModal(profileModal);
			});
		});
	}

	const acceptModalButton = profileModal.querySelector(".tp-fl-accept-modal-btn");
	if (acceptModalButton) {
		acceptModalButton.addEventListener("click", (evnet) => {
			const requestId = $(".tp-fl-requestPK").value;
			fetchAcceptFriendRequest(requestId);
			closeProfileModal(profileModal);
		});
	}

	const refuseModalButton = profileModal.querySelector(".tp-fl-refuse-modal-btn");
	if (refuseModalButton) {
		refuseModalButton.addEventListener("click", () => {
			const requestId = $(".tp-fl-requestPK").value;
			fetchRefuseFriendRequest(requestId);
			closeProfileModal(profileModal);
		});
	}



	/**
	 * 이미지 업로드 관련 (프로필 이미지 수정)
	 */
	const imageInput = profileModal.querySelector("#imageInput");
	if (imageInput) {

		const originImagePath = profileModal.querySelector(".tp-pf-photo-modal-thumnail").getAttribute("src");
		if (originImagePath !== "../../public/assets/img/sharkcookie.png") {
			setImageToInput(originImagePath, imageInput);
		}

		imageInput.addEventListener("change", async (event) => {
			event.preventDefault();
			const maxSize = 1 * 1024 * 1024 * 2;
			const file = event.target.files[0];

			if (file === undefined) {
				setImageToInput(originImagePath, imageInput);
				return;
			}

			if (file.size > maxSize) {
				alert(`${locale.myInfo.setImage}`);
				setImageToInput(originImagePath, imageInput);
				return;
			}

			if (!file.type.match("image/.*")) {
				alert(`${locale.myInfo.onlyImage}`);
				setImageToInput(originImagePath, imageInput);
				return;
			}

			const formData = new FormData();
			formData.append("profile_image", file);
			const result = await fetchImageFileRequest(formData);
			renderModifyFormModal(result, profileModal);
		});
	}



	/**
	 * 프로필 이미지 외에 유저 정보 수정
	 */
	const modifyForm = profileModal.querySelector(".tp-pf-form-myinfo-update");
	if (modifyForm) {
		modifyForm.addEventListener("submit", async (event) => {
			event.preventDefault();
			const nickname = modifyForm.nickname.value;
			if (nickname) {
				const regex = /^[\s\t\n\r]+|\s+$/g;
				if (regex.test(nickname) || nickname.length >= 20) {
					alert(`${locale.myInfo.nickAlert}`);
					return;
				}
			}
			const myData = new FormData(modifyForm);
			const updataMyInfo = await fetchModifyMyInfoRequest(myData);
			if (updataMyInfo !== undefined)
				closeProfileModal(profileModal);
		});
	}
}