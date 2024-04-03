import App from "./App.js";
import { $ } from "./utils/querySelector.js";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "../public/style/style.css";

window.addEventListener("DOMContentLoaded", (e) => {
    new App($("#app"));
});
