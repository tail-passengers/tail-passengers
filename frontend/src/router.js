import { routes } from "./utils/routeInfo.js";
import NotFound from "./pages/notFound.js";
import Profile from "./pages/profile.js";
import General from "./pages/general.js";
import { fetchUser } from "./utils/fetches.js";
import { deleteCSRFToken } from "./utils/cookie.js";

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
            if (isGeneralGamePage || isLoadingPage) {
                if (
                    confirm("잘못된 접근입니다. 홈 페이지로 이동하시겠습니까?")
                ) {
                    window.location.href = "/";
                } else {
                    // 사용자가 취소한 경우, 이전 페이지로 되돌리기
                    history.go(-1);
                }
            } else {
                // 이동할 페이지가 /general_game이나 /loading이 아닌 경우에는 그냥 route() 함수 호출
                route();
            }
        });
    };

    init();
    route();
}

export default Router;
