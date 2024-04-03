function Home($container) {
    this.$container = $container;

    this.setState = () => {
        this.render();
    };

    this.render = () => {
        const url = `https://api.intra.42.fr/oauth/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=https://${process.env.BASE_IP}:443/api/v1/login/42/callback/&response_type=code&state=311b7a86-a33a-4c61-9f5a-494ff36a272d`;

        this.$container.innerHTML = `
      <div class="content default-container">
        <div class="sized-box"></div>
        <div class = "default-container home-top-container">
          <button type="button" class="btn btn-primary" id="fetchUserDataBtn">Primary</button>
          <a href=${url} class="btn btn-primary">PONG GAME</a>
        </div>
        <div class="sized-box"></div>
        <div class="sized-box"></div>
        <div class = "home-bottom-container">
          <div></div>
          <div></div>
        </div>
      </div>
	  `;
    };

    this.render();
}

export default Home;
