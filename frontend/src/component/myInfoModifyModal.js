import { $ } from "../utils/querySelector.js";
import { addProfileModalEventListener } from "../utils/profileEventListener.js";

export default function renderModifyFormModal(myInfo, parentElement) {
    let contentHTML = `
		<div class="modal tp-sl-card-row tp-modal-div" tabindex="-1">
			<div class="modal-dialog default-container">
				<div class="modal-content tp-modal-accept tp-bgc-primary tp-myinfo-modal-content">
					<div class="modal-header tp-friend-modal-header">
						<h5 class="modal-title tp-color-secondary">Modify My Infomation</h5>
					</div>
					<div class="modal-body tp-friend-modal-body default-container">
						<form class="tp-pf-form-myinfo-update default-container tp-pf-forms tp-sl-card-row">
								<div class="tp-pf-photo-box">
									<div class="tp-pf-wd-blank"></div>
									<img class="tp-pf-photo-thumnail tp-pf-photo-modal-thumnail" src="../../public/assets/img/sharkcookie.png" />
									<button type="button" class="tp-pf-changeImage-button dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside">
										<img class="tp-pf-changeImage-thumnail" src="../../public/assets/img/changeProfile.png" />
									</button>
								</div>
								<div class="tp-pf-ht-blank"></div>
								<div class="input-group tp-pf-input-group default-container">
										<div class="tp-pf-elembox tp-pf-nickname">
											<label class="form-label tp-pf-label tp-pf-label-nickname default-container">NICKNAME</label>
											<input name="nickname" class="form-control tp-pf-input tp-pf-input-nickname tp-pf-modal-nickname" aria-describedby="nicknameHelp" placeholder="test" value="">
										</div>
										<div class="tp-pf-elembox tp-pf-record">
											<label class="form-label tp-pf-label tp-pf-label-record default-container">RECORD</label>
											<input class="form-control tp-pf-input tp-pf-input-record tp-pf-modal-record" placeholder="test WIN, test LOSE" value="" disabled>
										</div>
										<div class="tp-pf-elembox tp-pf-intraId">
											<label class="form-label tp-pf-label tp-pf-label-intraId default-container">INTRA ID</label>
											<input class="form-control tp-pf-input tp-pf-input-intraId tp-pf-modal-intraId" placeholder="test" value="" disabled>
										</div>
										<div class="tp-pf-elembox tp-pf-coalitions">
											<label class="form-label tp-pf-label tp-pf-label-coalitions default-container">COALITIONS</label>
											<select name="coalitions" class="form-select tp-bg-secondary tp-pf-modal-coalition" aria-label="Default select">
												<option value="1" selected">Gryffindor</option>
												<option value="2">Hufflepuff</option>
												<option value="3">Ravenclaw</option>
												<option value="4">Slytherin</option>
											</select>
										</div>
								</div>
							<div class="tp-pf-ht-blank"></div>
							<div class="tp-pf-btn-group d-grid gap-2 d-md-flex tp-fl-btn-group">
								<div class="tp-sl-btn-parent default-container">
									<button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-submit-modal-btn card default-container h-100 tp-fl-btn" value="SUBMIT" 
										data-bs-toggle="tooltip" title="Submit"> 
										<div class="card-body default-container ">
											<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✔︎</h5>
										</div>
									</button>
								</div>
								<div class="tp-sl-btn-parent default-container">
									<button type="button" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-close-btn card default-container h-100 tp-fl-btn" value="close"
									data-bs-toggle="tooltip" title="Close Modal" id="close-btn"> 
										<div class="card-body default-container">
											<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✗</h5>
										</div>
									</button>
								</div>
							</div>
						</form>
					</div>
					<div class="modal-footer tp-friend-modal-footer">
							<div class="dropdown">
								<button type="button" class="btn tp-pf-changeImage-butto dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="outside">
									<img class="tp-pf-changeImage-thumnail" src="../../public/assets/img/changeProfile.png" />
								</button>
								<form class="dropdown-menu p-4">
									<div class="mb-3">
										<label for="exampleDropdownFormEmail2" class="form-label">Email address</label>
										<input type="email" class="form-control" id="exampleDropdownFormEmail2" placeholder="email@example.com">
									</div>
									<div class="mb-3">
										<label for="exampleDropdownFormPassword2" class="form-label">Password</label>
										<input type="password" class="form-control" id="exampleDropdownFormPassword2" placeholder="Password">
									</div>
									<div class="mb-3">
										<div class="form-check">
											<input type="checkbox" class="form-check-input" id="dropdownCheck2">
											<label class="form-check-label" for="dropdownCheck2">
												Remember me
											</label>
										</div>
									</div>
									<button type="submit" class="btn btn-primary">Sign in</button>
								</form>
							</div>
					</div>
				</div>
			</div>
		</div>
	`;

    const renderUser = function (content) {
        const nickname = $(".tp-pf-modal-nickname");
        const intraId = $(".tp-pf-modal-intraId");
        const profileImg = $(".tp-pf-photo-modal-thumnail");
        const record = $(".tp-pf-modal-record");
        const winCount = $(".tp-pf-modal-wincount");
        const loseCount = $(".tp-pf-modal-wincount");
        const coalitions = $(".tp-pf-modal-coalition");
        nickname.value = content.nickname;
        intraId.value = content.intra_id;
        profileImg.src = "http://127.0.0.1:443" + content.profile_image;
        record.value =
            content.win_count + " WIN, " + content.lose_count + " LOSE";
        winCount.value = content.win_count;
        loseCount.value = content.lose_count;
        coalitions.value = content.coalitions;
    };

    let modifyModal = document
        .createRange()
        .createContextualFragment(contentHTML);
    const prevModal = parentElement.querySelector(".tp-modal-div");
    if (prevModal) {
        parentElement.removeChild(prevModal);
    }
    parentElement.appendChild(modifyModal);
    parentElement.style.display = "";
    addProfileModalEventListener(parentElement);
    renderUser(myInfo);
}
