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

        new Chart(document.getElementById("bar-chart"), {
            type: 'bar',
            data: {
                labels: ["Africa", "Asia", "Europe", "Latin America", "North America"],
                datasets: [
                    {
                        label: "Population (millions)",
                        backgroundColor: ["#3e95cd", "#8e5ea2","#3cba9f","#e8c3b9","#c45850"],
                        data: [2478,5267,734,784,433]
                    }
                ]
            },
            options: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Predicted world population (millions) in 2050'
                }
            }
        });
    };

    this.render();
}

export default Home;
