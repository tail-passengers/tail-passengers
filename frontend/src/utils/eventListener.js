import { navigate } from "./navigate.js";
import { fetchUser, fetchLogoutRequest } from "./fetches.js";
// import { renderPage } from "../component/navBar.js";
// import { changeLanguage, getCurrentLanguage, setLanguageCookie } from "./languageUtils.js";

export function addLoginEventListener(loginContainer) {
	fetchUser().then((myInfo) => {
		if (myInfo !== false && myInfo.detail === undefined) {
			closeLoginModal(loginContainer);
		}
	});

	const handleLoginResponse = (response) => {
		if (response.ok) {
			document.cookie = response.headers.get("Set-Cookie");
			console.log("response:", response);
			closeLoginModal(loginContainer);
		} else {
			console.error("Login failed");
		}
	};

	const closeLoginModal = (loginContainer) => {
		loginContainer.style.display = "none";
	};

	const closeButton = loginContainer.querySelector("#close-btn");
	closeButton.addEventListener("click", () =>
		closeLoginModal(loginContainer)
	);
}

export function addNavBarClickListener(navBarContainer) {
	navBarContainer.addEventListener("click", (e) => {
		const target = e.target.closest("a");
		if (!(target instanceof HTMLAnchorElement)) return;

		e.preventDefault();
		const targetURL = target.href.replace(`https://${process.env.BASE_IP}`, "");
		navigate(targetURL);
	});

	const logoutBtn = navBarContainer.querySelector("#logoutBtn");
	if (logoutBtn) {
		logoutBtn.addEventListener("click", (event) => {
			event.preventDefault();
			fetchLogoutRequest();
		});
	}
}

