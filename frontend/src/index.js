import App from "./App.js";
import { $ } from "./utils/querySelector.js";
import * as bootstrap from "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../public/style/style.css";

window.bootstrap = bootstrap;
window.addEventListener("DOMContentLoaded", (e) => {
  new App($("#app"));
});
