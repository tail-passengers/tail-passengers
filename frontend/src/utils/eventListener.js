import { navigate } from "./navigate.js";
import { BASE_URL } from "./routeInfo.js";
import { fetchLogoutRequest } from "./fetches.js";
// import { renderPage } from "../component/navBar.js";
// import { changeLanguage, getCurrentLanguage, setLanguageCookie } from "./languageUtils.js";

export function addLoginEventListener(loginContainer) {
    const loginUrl = `https://${process.env.BASE_IP}/api/v1/login`;
    const loginButton = loginContainer.querySelector("#login-btn");

    loginButton.addEventListener("click", (e) => {
        e.preventDefault();
        fetch(loginUrl, { credentials: "include" })
            .then(handleLoginResponse)
            .catch((error) => console.error("Error:", error));
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
        const targetURL = target.href.replace(BASE_URL, "");
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

