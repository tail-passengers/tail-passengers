export default function renderLoginModal() {
    return `
	<div class="modal">
		<div class="modal__content">
			<div class="back color-6">
				<div class="row columns position-relative">
					<img src="../../public/assets/img/ticket_small.png" class="img-fluid" alt="ticket_small">
					<ul class="menu align-center expanded text-center SMN_effect-16">
						<li><a id="sign-link">SIGN</a></li>
					</ul>
				</div>
			</div>
		</div >
    </div>
	`;
}

document.addEventListener('DOMContentLoaded', () => {
    const signLink = document.getElementById('sign-link');
    signLink.addEventListener('click', () => {
        fetch(`https://${process.env.BASE_IP}/api/v1/login/`, {
            method: 'GET',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(data); 
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    });
});
