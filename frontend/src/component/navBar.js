import { getCurrentLanguage, changeLanguage } from '../utils/languageUtils.js';
import locales from '../utils/locales/locales.js';

export function renderPage() {
  const navBarContainer = document.querySelector('#nav-bar');
  navBarContainer.innerHTML = renderNavBar();
}

export default function renderNavBar() {
  const language = getCurrentLanguage();
  const locale = locales[language] || locales.en;

  return `
  <nav class="navbar navbar-expand-lg tp-bg-secondary tp-navbar" data-bs-theme="dark">
      <div class="container-fluid">
          <a class="navbar-brand tp-navbar-brand" href="/">${locale.navBar.brand}</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarSupportedContent">
              <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                  <li class="nav-item tp-nav-item">
                      <a class="nav-link active" href="/selectmode">PONG GAME</a>
                  </li>
                  <li class="nav-item tp-nav-item">
                      <a class="nav-link active" href="/rank">RANK</a>
                  </li>
                  <li class="nav-item tp-nav-item">
                      <a class="nav-link active" href="/records">RECORDS</a>
                  </li>
              </ul>
              <div class="btn-group" role="group" aria-label="Language">
                  <button id="languageEN" type="button" class="btn btn-secondary ${language === 'en' ? 'active' : ''}">EN</button>
                  <button id="languageKO" type="button" class="btn btn-secondary ${language === 'ko' ? 'active' : ''}">KO</button>
                  <button id="languageJA" type="button" class="btn btn-secondary ${language === 'ja' ? 'active' : ''}">JP</button>
              </div>
          </div>
      </div>
  </nav>
  `;
}

document.addEventListener('click', function(event) {
  const languageButton = event.target.closest('.btn');
  if (!languageButton) return;

  const language = languageButton.id.replace('language', '').toUpperCase();
  changeLanguage(language.toLowerCase());
  renderPage();
});

document.addEventListener('DOMContentLoaded', function() {
  renderPage();
});