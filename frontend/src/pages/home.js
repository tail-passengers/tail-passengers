function Home($container) {
  this.$container = $container;
  this.$chartCanvas = null;
  this.myChart = null;

  this.setState = () => {
    this.render();
  };

  this.render = () => {
    this.$container.innerHTML = `
            <div class="content default-container" style="width:100%;">
                <img src="/public/assets/img/home.png" style="width:100%;"></img>
            </div>
        `;
  };
  this.render();
}

export default Home;
