import { navigate } from "./navigate.js";
import { fetchUser, fetchLogoutRequest } from "./fetches.js";
import { deleteCSRFToken, getCSRFToken } from "./cookie.js";

export function addLoginEventListener(loginContainer) {
    const csrfToken = getCSRFToken();
    if (csrfToken !== null) {
        fetchUser()
            .then((response) => {
                if (response !== false) {
                    closeLoginModal(loginContainer);
                }
            })
            .catch((error) => {
                console.log("[Error] addLoginEventListener() : ", error);
            });
    }

    const closeLoginModal = (loginContainer) => {
        loginContainer.style.display = "none";
    };
}

export function addNavBarClickListener(navBarContainer) {
    navBarContainer.addEventListener("click", (e) => {
        const target = e.target.closest("a");
        if (!(target instanceof HTMLAnchorElement)) return;

        e.preventDefault();
        const targetURL = target.href.replace(
            `https://${process.env.BASE_IP}`,
            ""
        );
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

window.addEventListener("beforeunload", async (event) => {
    if (!window.refreshing) {
        try {
            await fetch(`https://${process.env.BASE_IP}/api/v1/logout/`, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            deleteCSRFToken();
        } catch (error) {
            console.error("Error during logout:", error);
        }
    }
});

window.addEventListener("keydown", (event) => {
    if (event.key === "F5") {
        deleteCSRFToken();
				navigate("/");
    }

    if (event.key === "r" && event.metaKey) {
        deleteCSRFToken();
				navigate("/");
    }
});
