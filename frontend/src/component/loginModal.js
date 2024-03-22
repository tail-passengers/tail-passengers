export default function renderLoginModal() {
    return `
	<div class="modal">
		<div class="modal__background"></div>
		<div class="modal__content">
			<div class="content default-container">
			<div class="sized-box"></div>
			<div class="card lg_card lg_bgc">
				<div class="row g-0">
					<div class="col-md-4">
						<img src="../public/assets/img/ticket.png" class="img-fluid" alt="ticket">
						<img src="../public/assets/img/ticket_small.png" class="img-fluid" alt="ticket_small">
					</div>
					<div class="col-md-8">
						<div class="d-flex justify-content-center">
							<button class="button" id="login-btn">Login</button>
							<button class="button" id="close-btn">Close</button>
						</div>
					</div>
				</div>
			</div>
		</div >
    </div>
	`;
}
