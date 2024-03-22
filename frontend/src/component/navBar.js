export default function renderNavBar() {
  return `
  <nav class="navbar navbar-expand-lg tp-bg-secondary tp-navbar" data-bs-theme="dark">
    <div class="container-fluid">
      <a class="navbar-brand tp-navbar-brand" href="/">TAIL PASSENGER</a>
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
        <div class="tp-simple-status default-container">
          <div class="progress tp-winning-percentage" role="progressbar" aria-label="Success example" aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar tp-progress-bar" style="width: 25%"></div>
          </div>
          <div class="dropdown tp-bg-secondary tp-navbar-dropdown">
            <button class="btn tp-bg-secondary dropdown-toggle tp-dropdown-toggle" type="button" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
              PROFILE
            </button>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
              <li><a class="dropdown-item" href="/profile">Your Profile</a></li>
              <li><a class="dropdown-item" href="#">Settings</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a id="logoutBtn" class="dropdown-item" href="#">Logout</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </nav>
`;
}
