import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";
import { $ } from "../utils/querySelector.js";
import { addProfileModalEventListener } from "../utils/profileEventListener.js";

export default function renderModifyFormModal(myInfo, parentElement) {
	const language = getCurrentLanguage();
	const locale = locales[language] || locales.en;
	const renderModalForm = (parentElement) => {
		let contentHTML = `
			<div class="modal tp-sl-card-row tp-modal-div" tabindex="-1">
				<div class="modal-dialog default-container">
					<div class="modal-content tp-modal-modify tp-bgc-primary tp-myinfo-modal-content default-container">
						<div class="modal-header tp-friend-modal-header">
							<h5 class="modal-title tp-color-secondary">${locale.myInfo.modifyMyInfoTitle}</h5>
						</div>
						<div class="modal-body tp-friend-modal-body default-container">
							<form class="tp-pf-form-myinfo-image accordion" method="POST" id="accordionImageInput" enctype="multipart/form-data">
									<div class="accordion-item default-container tp-pf-image-accorion-item">
										<div class="tp-pf-photo-box accordion-header">
											<div class="tp-pf-wd-blank"></div>
											<img class="tp-pf-photo-thumnail tp-pf-photo-modal-thumnail" src="../../public/assets/img/sharkcookie.png" />
											<button type="button" class="btn tp-pf-changeImage-button" data-bs-toggle="collapse" data-bs-target="#collapseImageForm" aria-expanded="false" aria-controls="collapseImageForm" id="accordionImageInput">
												<img class="tp-pf-changeImage-thumnail" src="../../public/assets/img/changeProfile.png" />
											</button>
										</div>
										<div id="collapseImageForm" class="accordion-collapse collapse default-container" data-bs-parent="#accordionImageInput">
											<div class="accordion-body tp-pf-accordion-body">
												<div class="input-group tp-pf-input-file-grp">
													<input type="file" name="profileImage" id="imageInput" accept="image/*" class="form-control tp-pf-input tp-pf-input-file" aria-label="Upload">
													<button type="button" class="btn btn-outline-secondary tp-sl-btn-primary tp-pf-file-btn">${locale.myInfo.modifyMyInfoImageButton}</button>
												</div>
											</div>
										</div>
									</div>
							</form>
							<form class="tp-pf-form-myinfo-update default-container tp-pf-forms tp-sl-card-row">
									<div class="tp-pf-ht-blank"></div>
									<div class="input-group tp-pf-input-group default-container">
											<div class="tp-pf-elembox tp-pf-nickname">
												<label class="form-label tp-pf-label tp-pf-label-nickname default-container">${locale.myInfo.myNickname}</label>
												<input name="nickname" class="form-control tp-pf-input tp-pf-input-nickname tp-pf-modal-nickname" aria-describedby="nicknameHelp" placeholder="test" value="">
											</div>
											<div class="tp-pf-elembox tp-pf-record">
												<label class="form-label tp-pf-label tp-pf-label-record default-container">${locale.myInfo.myRecord}</label>
												<input class="form-control tp-pf-input tp-pf-input-record tp-pf-modal-record" placeholder="test WIN, test LOSE" value="" disabled>
											</div>
											<div class="tp-pf-elembox tp-pf-intraId">
												<label class="form-label tp-pf-label tp-pf-label-intraId default-container">${locale.myInfo.myIntraId}</label>
												<input class="form-control tp-pf-input tp-pf-input-intraId tp-pf-modal-intraId" placeholder="test" value="" disabled>
											</div>
											<div class="tp-pf-elembox tp-pf-house">
												<label class="form-label tp-pf-label tp-pf-label-house default-container">${locale.myInfo.myHouse}</label>
												<select name="house" class="form-select tp-pf-input tp-bg-secondary tp-pf-modal-house" aria-label="Default select">
													<option class="tp-pf-house-item tp-pf-house-gr" value="GR">${locale.house.griffindor}</option>
													<option class="tp-pf-house-item tp-pf-house-hu" value="HU">${locale.house.hufflepuff}</option>
													<option class="tp-pf-house-item tp-pf-house-ra" value="RA">${locale.house.ravenclaw}</option>
													<option class="tp-pf-house-item tp-pf-house-sl" value="SL">${locale.house.slytherin}</option>
												</select>
											</div>
									</div>
								<div class="tp-pf-ht-blank"></div>
								<div class="tp-pf-btn-group d-grid gap-2 d-md-flex tp-fl-btn-group-modal">
									<div class="tp-sl-btn-parent default-container">
										<button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-submit-modal-btn card default-container h-100 tp-fl-btn" value="SUBMIT" 
											data-bs-toggle="tooltip" title="${locale.myInfo.tooltipSubmit}"> 
											<div class="card-body default-container ">
												<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✔︎</h5>
											</div>
										</button>
									</div>
									<div class="tp-sl-btn-parent default-container">
										<button type="button" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-close-btn card default-container h-100 tp-fl-btn" value="close"
										data-bs-toggle="tooltip" title="${locale.myInfo.tooltipCloseModal}" id="close-btn"> 
											<div class="card-body default-container">
												<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✗</h5>
											</div>
										</button>
									</div>
								</div>
							</form>
						</div>
						<div class="modal-footer tp-friend-modal-footer">
						</div>
					</div>
				</div>
			</div>
		`;

		const modifyModal = document.createRange().createContextualFragment(contentHTML);
		const prevModal = parentElement.querySelector(".tp-modal-div");
		if (prevModal)
		{
			parentElement.removeChild(prevModal);
		}
		parentElement.appendChild(modifyModal);
		parentElement.style.display = "";
	};

	const handlerHouseValue = function(houseName) {
    const house = $(".tp-pf-modal-house");
    const options = house.querySelectorAll(".tp-pf-house-item");
    options.forEach(option => {
        if (option.value === houseName) {
            option.selected = true;
        }
    });
	}

	const renderUser = function (content) {
		const nickname = $(".tp-pf-modal-nickname");
		const intraId = $(".tp-pf-modal-intraId");
		const profileImg = $(".tp-pf-photo-modal-thumnail");
		const record = $(".tp-pf-modal-record");
		nickname.value = content.nickname;
		intraId.value = content.intra_id;
		profileImg.src = `https://${process.env.BASE_IP}` + content.profile_image;
		record.value = content.win_count + `${locale.myInfo.win}, ` + content.lose_count + `${locale.myInfo.lose}`;
		handlerHouseValue(content.house);
	};

	// let modifyModal = document.createRange().createContextualFragment(contentHTML);
	// const prevModal = parentElement.querySelector(".tp-modal-div");
	// if (prevModal)
	// {
	// 	parentElement.removeChild(prevModal);
	// }
	// parentElement.appendChild(modifyModal);
	// parentElement.style.display = "";
	renderModalForm(parentElement);
	renderUser(myInfo);
	addProfileModalEventListener(parentElement, myInfo);
}