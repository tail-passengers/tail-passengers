import { getCurrentLanguage, changeLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";
import { fetchUser } from "../utils/fetches.js";

export function renderPage() {
    const navBarContainer = document.querySelector("#nav-bar");
    navBarContainer.innerHTML = renderNavBar();
    renderProgressBar();
}

export default function renderNavBar() {
    const language = getCurrentLanguage();
    const locale = locales[language] || locales.en;

    return `
  <nav class="navbar navbar-expand-lg tp-bg-secondary tp-navbar" data-bs-theme="dark">
      <div class="container-fluid">
          <a class="navbar-brand tp-navbar-brand" href="/">${
              locale.navBar.brand
          }</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarSupportedContent">
              <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                  <li class="nav-item tp-nav-item">
                      <a class="nav-link active" href="/selectmode">${
                          locale.navBar.pongGame
                      }</a>
                  </li>
                  <li class="nav-item tp-nav-item">
                      <a class="nav-link active" href="/rank">${
                          locale.navBar.rank
                      }</a>
                  </li>
                  <li class="nav-item tp-nav-item">
                      <a class="nav-link active" href="/records">${
                          locale.navBar.records
                      }</a>
                  </li>
              </ul>
              <div class="btn-group" role="group" aria-label="Language">
                  <button id="languageEN" type="button" class="btn btn-secondary ${
                      language === "en" ? "active" : ""
                  }">EN</button>
                  <button id="languageKO" type="button" class="btn btn-secondary ${
                      language === "ko" ? "active" : ""
                  }">KO</button>
                  <button id="languageJA" type="button" class="btn btn-secondary ${
                      language === "ja" ? "active" : ""
                  }">JP</button>
              </div>
              <div class="tp-simple-status default-container">
                <div class="progress tp-winning-percentage" role="progressbar" aria-label="Success example" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
                  <div class="progress-bar tp-progress-bar" style="width: 0%"></div>
                </div>
                <div class="dropdown tp-bg-secondary tp-navbar-dropdown">
                  <button class="btn tp-bg-secondary dropdown-toggle tp-dropdown-toggle" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
                    ${locale.navBar.profile}
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
                    <li><a class="dropdown-item" href="/profile">${
                        locale.navBar.profile
                    }</a></li>
                    <li><a id="logoutBtn" class="dropdown-item" href="#">${
                        locale.navBar.logout
                    }</a></li>
                  </ul>
              </div>
          </div>
      </div>
  </nav>
  `;
}

async function renderProgressBar() {
    const renderUser = (user) => {
        if (user) {
            const progressBar = $(".tp-progress-bar")[0];
            const result = (user.win_count / 100) * 100; //TODO - 분모값 추후 변경 가능성 있음
            if (progressBar) {
                progressBar.innerHTML = result + "%";
                progressBar.style.width = result + "%";
            } else {
                console.log("addNavBarLoadListener():: Can't find progressBar!");
            }
        }
    };
    
    const setState = (content) => {
        renderUser(content);
    };

    let data = await fetchUser();
    if (data) {
        setState(data[0]);
    }
}

document.addEventListener("click", function (event) {
    const languageButton = event.target.closest(".btn");
    if (!languageButton) return;

    const languageID = languageButton.id;
    if (languageID.startsWith("language")) {
        const language = languageID.replace("language", "").toUpperCase();
        changeLanguage(language.toLowerCase());
        renderPage();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    renderPage();
});
