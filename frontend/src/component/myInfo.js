export default function renderMyInfoForm() {
	return `
	<form class="tp-pf-form-myinfo-view default-container tp-pf-forms tp-sl-card-row">
			<div class="tp-pf-photo-box">
					<div class="tp-pf-wd-blank"></div>
					<img class="tp-pf-photo-thumnail" src="../../public/assets/img/sharkcookie.png" />
			</div>
			<div class="tp-pf-ht-blank"></div>
			<div class="input-group tp-pf-input-group default-container">
					<div class="tp-pf-elembox tp-pf-nickname">
						<label class="form-label tp-pf-label tp-pf-label-nickname default-container">NICKNAME</label>
						<input class="form-control tp-pf-input tp-pf-input-nickname" aria-describedby="nicknameHelp" placeholder="test" value="" disabled>
					</div>
					<div class="tp-pf-elembox tp-pf-record">
						<label class="form-label tp-pf-label tp-pf-label-record default-container">RECORD</label>
						<input class="form-control tp-pf-input tp-pf-input-record" placeholder="test WIN, test LOSE" value="" disabled>
					</div>
					<div class="tp-pf-elembox tp-pf-intraId">
						<label class="form-label tp-pf-label tp-pf-label-intraId default-container">INTRA ID</label>
						<input class="form-control tp-pf-input tp-pf-input-intraId" placeholder="test" value="" disabled>
					</div>
					<div class="tp-pf-elembox tp-pf-coalition">
						<label class="form-label tp-pf-label tp-pf-label-coalition default-container">COALITION</label>
						<input class="form-control tp-pf-input tp-pf-input-coalition" placeholder="test" value="" disabled>
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
}