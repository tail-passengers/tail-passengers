import { addProfileModalEventListener } from "../utils/profileEventListener.js";

export default function renderRequestModal(selectBtn, parentElement, requestId) {
	let contentHTML = `
		<div class="modal tp-sl-card-row tp-modal-div" tabindex="-1">
			<div class="modal-dialog default-container">
				<div class="modal-content tp-modal-accept tp-bgc-primary tp-friend-modal-content">
					<div class="modal-header tp-friend-modal-header">
						<h5 class="modal-title"></h5>
					</div>
					<div class="modal-body tp-friend-modal-body default-container">
						<p>Do you accept the friend request?</p>
					</div>
					<div class="modal-footer tp-friend-modal-footer">
						<input type="hidden" class="tp-fl-requestPK" value="${requestId}"></input>
						<div class="tp-pf-btn-group d-grid gap-2 d-md-flex tp-fl-btn-group-modal">
						<div class="tp-sl-btn-parent default-container">
							<button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-accept-modal-btn card default-container h-100 tp-fl-btn" value="accept" 
								data-bs-toggle="tooltip" title="Accept"> 
								<div class="card-body default-container ">
									<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✔︎</h5>
								</div>
							</button>
						</div>
						<div class="tp-sl-btn-parent default-container">
							<button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-close-btn card default-container h-100 tp-fl-btn" value="close"
								data-bs-toggle="tooltip" title="Close Modal" id="close-btn"> 
								<div class="card-body default-container">
									<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✗</h5>
								</div>
							</button>
						</div>
					</div>
					</div>
				</div>
				<div class="modal-content tp-modal-refuse tp-bgc-primary tp-friend-modal-content visually-hidden">
					<div class="modal-header tp-friend-modal-header">
						<h5 class="modal-title"></h5>
					</div>
					<div class="modal-body tp-friend-modal-body default-container">
						<p>Do you Refuse the friend request?</p>
					</div>
					<div class="modal-footer tp-friend-modal-footer">
						<div class="tp-pf-btn-group d-grid gap-2 d-md-flex tp-fl-btn-group-modal">
						<div class="tp-sl-btn-parent default-container">
							<button type="submit" class="btn tp-sl-btn-primary tp-pf-btn tp-fl-refuse-modal-btn card default-container h-100 tp-fl-btn" value="refuse" 
								data-bs-toggle="tooltip" title="Refuse"> 
								<div class="card-body default-container">
									<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✔︎</h5>
								</div>
							</button>
						</div>
						<div class="tp-sl-btn-parent default-container">
							<button class="btn tp-sl-btn-primary tp-pf-btn tp-fl-close-btn card default-container h-100 tp-fl-btn" value="close"
								data-bs-toggle="tooltip" title="Close Modal" id="close-btn"> 
								<div class="card-body default-container">
									<h5 class="tp-pf-card-title default-container tp-fl-btn-letter">✗</h5>
								</div>
							</button>
					</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	`;

	let requestModal = document.createRange().createContextualFragment(contentHTML);
	const prevModal = parentElement.querySelector(".tp-modal-div");
	if (prevModal)
	{
		parentElement.removeChild(prevModal);
	}
	parentElement.appendChild(requestModal);
	parentElement.style.display = "";
	addProfileModalEventListener(parentElement, "FRIENDS");


	const acceptModalContent = parentElement.querySelector(".tp-modal-accept");
	const refuseModalContent = parentElement.querySelector(".tp-modal-refuse");

	if (selectBtn === "ACCEPT")
	{
		acceptModalContent.classList.remove("visually-hidden");
		refuseModalContent.classList.add("visually-hidden");
	}
	else if (selectBtn === "REFUSE")
	{
		refuseModalContent.classList.remove("visually-hidden");
		acceptModalContent.classList.add("visually-hidden");
	}	
}