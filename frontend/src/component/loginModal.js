export default function renderLoginModal() {
    return `
	<div class="modal">
		<div class="modal__content">
			<div class="back color-6">
				<div class="row columns position-relative">
					<img src="../../public/assets/img/ticket_small.png" class="img-fluid" alt="ticket_small">
					<ul class="menu align-center expanded text-center SMN_effect-16">
						<li><a href="https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-a386dd1a6ec3e1df7bbd427c9ebe30d4d811b69b473188d562bc342e059962db&redirect_uri=https%3A%2F%2F127.0.0.1%2Fapi%2Fv1%2Flogin%2F42%2Fcallback%2F&response_type=code">SIGN</a></li>
					</ul>
				</div>
			</div>
		</div >
    </div>
	`;
}
