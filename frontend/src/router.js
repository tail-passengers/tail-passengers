import { routes } from "./utils/routeInfo.js";
import NotFound from "./pages/notFound.js";
import Profile from "./pages/profile.js";
import { closeSocket } from "./pages/general.js";
import { fetchUser } from "./utils/fetches.js";
import { deleteCSRFToken } from "./utils/cookie.js";
import Dashboard from "./pages/dashboard.js";

function Router($container) {
    this.$container = $container;
    let currentPage = undefined;

    const findMatchedRoute = () =>
        routes.find((route) => route.path.test(location.pathname));

    const route = () => {
        currentPage = null;
        const TargetPage = findMatchedRoute()?.element || NotFound;
        currentPage = new TargetPage(this.$container);

        if (
            !(currentPage instanceof Profile) &&
            localStorage.getItem("intervalId")
        ) {
            clearInterval(localStorage.getItem("intervalId"));
            localStorage.removeItem("intervalId");
        }

				if (!(currentPage instanceof Dashboard)) {
					const chart = document.getElementById("bar-chart");
					if (chart) {
						document.removeChild(chart);
						console.log("HELLO!");
					}
				}
    };

    const init = () => {
        window.addEventListener("historychange", ({ detail }) => {
            const { to, isReplace } = detail;

            const data = fetchUser();
            if (data === false) {
                deleteCSRFToken();
            }

            if (isReplace || to === location.pathname) {
                history.replaceState(null, "", to);
            } else {
                history.pushState(null, "", to);
            }
            route();
        });

        window.addEventListener("popstate", () => {
            const currentPagePath = location.pathname;
            const isGeneralGamePage = currentPagePath.includes("/general_game");
            const isLoadingPage = currentPagePath.includes("/loading");
						const isGamePage = currentPagePath.includes("/game");
            const isTournamentPage =
                currentPagePath.includes("/tournament_game");
						if (isGamePage) {
							alert("This is invalid contact");
							history.go(-1);
						}
            if (isGeneralGamePage || isLoadingPage || isTournamentPage) {
								closeSocket();
                if (
                    confirm(
                        "Your approach seems to be incorrect. Would you like to navigate to the home page?\n\n\nOK -> Go to home\nCancel -> Go back to the previous page"
                    )
                ) {
                    window.location.href = "/";
                } else {
                    history.go(-1);
                }
            } else {
                route();
            }
        });
    };

    init();
    route();
}

export default Router;
