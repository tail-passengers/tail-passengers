import renderNavBar from "./component/navBar.js";
import renderFooter from "./component/footer.js";
import renderLoginModal from "./component/loginModal.js";
import Router from "./router.js";
import {
  addLoginEventListener,
  addNavBarClickListener,
} from "./utils/eventListener.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import * as THREE from "three";

window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.TextGeometry = TextGeometry;
window.FontLoader = FontLoader;

document.addEventListener("DOMContentLoaded", function () {
  const loginContainer = document.getElementById("loginModal");
  const navBarContainer = document.getElementById("nav-bar");
  const footerContainer = document.getElementById("footer");

  navBarContainer.innerHTML = renderNavBar();
  footerContainer.innerHTML = renderFooter();
  loginContainer.innerHTML = renderLoginModal();

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
