import Chart from 'chart.js/auto';

function Home($container) {
    this.$container = $container;
    this.$chartCanvas = null;
    this.gameLogs = []; // 전체 전적 데이터

    this.setState = () => {
        this.render();
    };

    this.render = () => {
        this.$container.innerHTML = `
            <div class="content default-container">
                <div class="sized-box"></div>
                <div class="home-top-container">
                    <canvas id="bar-chart" style="flex:1;"></canvas>
                    <div id="records-box">
                        <ul id="records-list"></ul>
                    </div>
                </div>
                <div class="sized-box"></div>
                <div class="sized-box"></div>
                <div class="home-bottom-container">
                    <div></div>
                    <div></div>
                </div>
            </div>
        `;

        this.$chartCanvas = document.getElementById('bar-chart');

        this.generateGameLogs();

        this.renderChart();
        this.renderRecords();
    };

    this.generateGameLogs = () => {
        this.gameLogs = [
            { winner: 'Player1', loser: 'Player2', start_time: new Date().toISOString() },
            { winner: 'Player2', loser: 'Player3', start_time: new Date().toISOString() },
            { winner: 'Player3', loser: 'Player4', start_time: new Date().toISOString() },
            { winner: 'Player4', loser: 'Player5', start_time: new Date().toISOString() },
            { winner: 'Player5', loser: 'Player6', start_time: new Date().toISOString() },
        ];
    };

    this.renderRecords = () => {
        const recordsList = document.getElementById('records-list');
        recordsList.innerHTML = ''; 

        const limitedGameLogs = this.gameLogs.slice(0, 5);
        
        limitedGameLogs.forEach(log => {
            const li = document.createElement('li');
            li.textContent = `${log.winner} vs ${log.loser}`;
            li.style.color = 'black';
            recordsList.appendChild(li);
        });
    };

    this.renderChart = () => {
        const width = this.$chartCanvas.offsetWidth;
        const height = this.$chartCanvas.offsetHeight;

        this.$chartCanvas.width = width;
        this.$chartCanvas.height = height;

        const ctx = this.$chartCanvas.getContext('2d');
        const myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["Africa", "Asia", "Europe", "Latin America"],
                datasets: [{
                    label: 'Population (millions)',
                    data: [2478, 5267, 734, 784],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                    ],
                    borderWidth: 1
                }]
            }
        });
    };

    window.addEventListener('resize', () => {
        this.renderChart();
    });

    this.render();
}

export default Home;
