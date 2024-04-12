export default function renderLoginModal() {
    return `
	<div class="modal">
		<div class="modal__content">
			<div class="back color-6">
				<div class="row columns position-relative">
					<img src="/public/assets/img/ticket_small.png" class="img-fluid" alt="ticket_small">
					<ul class="menu align-center expanded text-center SMN_effect-16">
						<li><a href="/api/v1/login">SIGN</a></li>
					</ul>
				</div>
			</div>
		</div >
    </div>
	`;
}
