import { $ } from "../utils/querySelector.js";
import { addMyInfoEventListener } from "../utils/profileEventListener.js";

export default function renderMyInfoForm(content, parentElement) {
	let contentHTML = `
		<form class="tp-pf-form-myinfo-view default-container tp-pf-forms tp-sl-card-row">
				<div class="tp-pf-photo-box">
						<div class="tp-pf-wd-blank"></div>
						<img class="tp-pf-photo-thumnail" src="../../public/assets/img/sharkcookie.png" />
				</div>
				<div class="tp-pf-ht-blank"></div>
				<div class="input-group tp-pf-input-group default-container">
						<div class="tp-pf-elembox tp-pf-nickname">
							<label class="form-label tp-pf-label tp-pf-label-nickname default-container">NICKNAME</label>
							<input name="nickname" class="form-control tp-pf-input tp-pf-input-nickname" aria-describedby="nicknameHelp" placeholder="test" value="" disabled>
						</div>
						<div class="tp-pf-elembox tp-pf-record">
							<label class="form-label tp-pf-label tp-pf-label-record default-container">RECORD</label>
							<input class="form-control tp-pf-input tp-pf-input-record" placeholder="test WIN, test LOSE" value="" disabled>
						</div>
						<div class="tp-pf-elembox tp-pf-intraId">
							<label class="form-label tp-pf-label tp-pf-label-intraId default-container">INTRA ID</label>
							<input name="intraId" class="form-control tp-pf-input tp-pf-input-intraId" placeholder="test" value="" disabled>
						</div>
						<div class="tp-pf-elembox tp-pf-house">
							<label class="form-label tp-pf-label tp-pf-label-house default-container">HOUSE</label>
							<select name="house" class="form-select tp-pf-input tp-bg-secondary tp-pf-input-house" aria-label="Default select" id="house" disabled>
								<option class="tp-pf-house-item tp-pf-house-gr" value="GR">Gryffindor</option>
								<option class="tp-pf-house-item tp-pf-house-hu" value="HU">Hufflepuff</option>
								<option class="tp-pf-house-item tp-pf-house-ra" value="RA">Ravenclaw</option>
								<option class="tp-pf-house-item tp-pf-house-sl" value="SL">Slytherin</option>
							</select>
						</div>
				</div>
			<div class="tp-pf-ht-blank"></div>
			<div class="tp-sl-btn-parent default-container">
					<button type="submit" class="btn tp-btn-primary tp-sl-btn-primary tp-pf-btn tp-pf-modify-btn card default-container h-100" value="modify"> 
						<div class="card-body">
							<h5 class="tp-pf-card-title default-container">MODIFY</h5>
						</div>
					</button>
			</div>
		</form>
	`;

	const handlerHouseValue = function(houseName) {
    const house = $(".tp-pf-input-house");
    const options = house.querySelectorAll(".tp-pf-house-item");
    options.forEach(option => {
        if (option.value === houseName) {
            option.selected = true;
        }
    });
	}

	const renderUser = function (content) {
		const nickname = $(".tp-pf-input-nickname");
		const intraId = $(".tp-pf-input-intraId");
		const profileImg = $(".tp-pf-photo-thumnail");
		const record = $(".tp-pf-input-record");
		const house = $(".tp-pf-input-house");
		nickname.value = content.nickname;
		intraId.value = content.intra_id;
		profileImg.src = `https://${process.env.BASE_IP}` + content.profile_image;
		record.value = content.win_count + " WIN, " + content.lose_count + " LOSE";
		handlerHouseValue(content.house);
	};

	parentElement.innerHTML = contentHTML;
	addMyInfoEventListener(content);
	renderUser(content);
}