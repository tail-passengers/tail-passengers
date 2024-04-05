import Chart from 'chart.js/auto';

function Home($container) {
    this.$container = $container;
    
    this.setState = () => {
        this.render();
    };

    this.render = () => {
        this.$container.innerHTML = `
            <div class="content default-container">
                <div class="sized-box"></div>
                <div class="default-container home-top-container">
                    <canvas id="bar-chart" width="300" height="230"></canvas>
                </div>
                <div class="sized-box"></div>
                <div class="sized-box"></div>
                <div class="home-bottom-container">
                    <div></div>
                    <div></div>
                </div>
            </div>
        `;

        const ctx = document.getElementById('bar-chart').getContext('2d');
        const myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["Africa", "Asia", "Europe", "Latin America"],
                datasets: [{
                    label: 'Population (millions)',
                    data: [2478, 5267, 734, 784],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };
    this.render();
}

export default Home;
