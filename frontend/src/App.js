import renderNavBar from "./component/navBar.js";
import renderFooter from "./component/footer.js";
import renderLoginModal from "./component/loginModal.js";
import Router from "./router.js";
import {
    addLoginEventListener,
    addNavBarClickListener,
    addNavBarLoadListener,
} from "./utils/eventListener.js";

document.addEventListener("DOMContentLoaded", function () {
    const navBarContainer = document.getElementById("nav-bar");
    const footerContainer = document.getElementById("footer");
    const loginContainer = document.getElementById("loginModal");

    navBarContainer.innerHTML = renderNavBar();
    footerContainer.innerHTML = renderFooter();
    loginContainer.innerHTML = renderLoginModal();

    addNavBarLoadListener(navBarContainer);
    addNavBarClickListener(navBarContainer);
    addLoginEventListener(loginContainer);
});

export default function App($container) {
    this.$container = $container;

    const init = () => {
        new Router($container);
    };

    init();
}
