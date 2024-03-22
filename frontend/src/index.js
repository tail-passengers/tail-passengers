import App from "./App.js";
import { $ } from "./utils/querySelector.js";

window.addEventListener("DOMContentLoaded", (e) => {
    new App($("#app"));
});
