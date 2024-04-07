function Home($container) {
	this.$container = $container;

	this.setState = () => {
		this.render();
	};

	this.render = () => {
		this.$container.innerHTML = `
      <div class="content default-container">
        <div class="sized-box"></div>
        <div class = "default-container home-top-container">
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
