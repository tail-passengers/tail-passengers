import { routes } from "./utils/routeInfo.js";
import NotFound from "./pages/notFound.js";
import Profile from "./pages/profile.js";
import General from "./pages/general.js";

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

            const target = to.split("/")[3];
            if (isReplace || to === location.pathname) {
                history.replaceState(null, "", to);
            } else {
                if (target !== "general_game") {
                    console.log(target);
                    history.pushState(null, "", to);
                }
            }
            route();
        });

        window.addEventListener("popstate", () => {
            route();
        });
    };

    init();
    route();
}

export default Router;
