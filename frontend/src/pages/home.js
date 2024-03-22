function Home($container) {
    this.$container = $container;

    this.setState = () => {
        this.render();
    };

    // this.fetchUserData = () => {
    //     fetch("http://127.0.0.1:8000/users/")
    //         .then((response) => response.json())
    //         .then((data) => {
    //             // console.log(data);
    //         })
    //         .catch((error) => {
    //             console.error("Error fetching user data:", error);
    //         });
    // };

    this.render = () => {
        this.$container.innerHTML = `
      <div class="content default-container">
        <div class="sized-box"></div>
        <div class = "default-container home-top-container">
          <button type="button" class="btn btn-primary" id="fetchUserDataBtn">Primary</button>
          <a href="https://api.intra.42.fr/oauth/authorize?client_id=u-s4t2ud-66e98d10e78437977ceaece1249062008fadaaf0d03649acf43c1a5c12aff671&redirect_uri=http://127.0.0.1:8000/api/v1/login/42/callback/&response_type=code&state=311b7a86-a33a-4c61-9f5a-494ff36a272d" class="btn btn-primary">PONG GAME</a>
        </div>
        <div class="sized-box"></div>
        <div class="sized-box"></div>
        <div class = "home-bottom-container">
          <div></div>
          <div></div>
        </div>
      </div>
	  `;
        // this.fetchUserData();
        // const fetchUserDataBtn =
        //     this.$container.querySelector("#fetchUserDataBtn");
        // fetchUserDataBtn.addEventListener("click", this.fetchUserData);
    };

    this.render();
}

export default Home;
