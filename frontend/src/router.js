import { routes } from "./utils/routeInfo.js";
import NotFound from "./pages/notFound.js";

import { closeSocket } from "./pages/general.js";
import { fetchUser } from "./utils/fetches.js";
import { deleteCSRFToken } from "./utils/cookie.js";
import Dashboard from "./pages/dashboard.js";
import { getCurrentLanguage } from "./utils/languageUtils.js";
import locales from "./utils/locales/locales.js";

function Router($container) {
	this.$container = $container;
	let currentPage = undefined;

	const findMatchedRoute = () =>
		routes.find((route) => route.path.test(location.pathname));

	const route = () => {
		currentPage = null;
		const TargetPage = findMatchedRoute()?.element || NotFound;
		currentPage = new TargetPage(this.$container);
		const navBar = document.getElementById("nav-bar");

		if (!(currentPage instanceof Home)) {
			navBar.querySelector(".lang-group").classList.add("visually-hidden");
		} else {
			navBar.querySelector(".lang-group").classList.remove("visually-hidden");
		}
		if (!(currentPage instanceof Dashboard)) {
			const chart = document.getElementById("bar-chart");
			if (chart) {
				document.removeChild(chart);
			}
		}
	};

	const init = () => {
		const language = getCurrentLanguage();
		const locale = locales[language] || locales.en;
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
			const isTournamentWaitPage = currentPagePath.includes("/tournament");
			if (isTournamentWaitPage) {
				closeSocket();
			}
			if (isGamePage) {
				alert(`${locale.router.invalid}`);
				history.go(-1);
			}
			if (isGeneralGamePage || isLoadingPage || isTournamentPage) {
				closeSocket();
				if (
					confirm(
						`${locale.router.confirm}`
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
