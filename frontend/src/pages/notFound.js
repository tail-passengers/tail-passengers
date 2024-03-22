function NotFound($container) {
    this.$container = $container;

    this.setState = () => {
        this.render();
    };

    this.render = () => {
        this.$container.innerHTML = `
      <div class="container tp-color-secondary">
        <div class="default-container h2">404 NOT FOUND -> Route 설정을 다시 확인해주세요.</div>
      </div>
    `;
    };

    this.render();
}

export default NotFound;
