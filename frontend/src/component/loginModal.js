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
							<a href="https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-a386dd1a6ec3e1df7bbd427c9ebe30d4d811b69b473188d562bc342e059962db&redirect_uri=https%3A%2F%2F127.0.0.1%2Fapi%2Fv1%2Flogin%2F42%2Fcallback%2F&response_type=code" id="login-btn">Login</a>
							<button class="button" id="close-btn">Close</button>
						</div>
					</div>
				</div>
			</div>
		</div >
    </div>
	`;
}
