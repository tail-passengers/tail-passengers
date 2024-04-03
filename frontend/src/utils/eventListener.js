import { navigate } from "./navigate.js";
import { BASE_URL } from "./routeInfo.js";
import { $ } from "./querySelector.js";
import { fetchUser, fetchLogoutRequest } from "./fetches.js";
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
    logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        fetchLogoutRequest();
    });
}

export async function addNavBarLoadListener(navBarContainer) {
    const renderUser = (user) => {
        const progressBar = $(".tp-progress-bar");
        const result = (user.win_count / 100) * 100; //TODO - 분모값 추후 변경 가능성 있음
        if (progressBar) {
            progressBar.innerHTML = result + "%";
            progressBar.style.width = result + "%";
        } else {
            console.log("addNavBarLoadListener():: Can't find progressBar!");
        }
    };

    const setState = (content) => {
        renderUser(content);
    };

    let data = await fetchUser();
    setState(data[0]);
}
