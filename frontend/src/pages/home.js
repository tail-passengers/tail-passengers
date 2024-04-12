import Chart from "chart.js/auto";
import { fetchChartData } from "../utils/fetches";
import { getCurrentLanguage } from "../utils/languageUtils.js";
import locales from "../utils/locales/locales.js";

function Home($container) {
    this.$container = $container;
    this.$chartCanvas = null;
    this.gameLogs = [];
    this.myChart = null;
    const language = getCurrentLanguage();
    const locale = locales[language] || locales.en;

    this.setState = () => {
        this.render();
    };

    this.render = async () => {
        this.$container.innerHTML = `
            <div class="content default-container">
                <div class="sized-box"></div>
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

        this.$chartCanvas = document.getElementById("bar-chart");

        const apiResponse = await fetchChartData();
        const houseRates = apiResponse.house;
        const userRates = apiResponse.rate;

        this.renderChart(houseRates, userRates, locale);
        this.renderRecords();
    };

    this.renderRecords = () => {
        const recordsList = document.getElementById("records-list");
        recordsList.innerHTML = "";

        const limitedGameLogs = this.gameLogs.slice(0, 5);

        limitedGameLogs.forEach((log) => {
            const li = document.createElement("li");
            li.textContent = `${log.winner} vs ${log.loser}`;
            li.style.color = "black";
            recordsList.appendChild(li);
        });
    };

    this.renderChart = (houseRates, userRates, locale) => {
        const labels = Object.keys(houseRates);
        const datasets = [];

        const houseDataset = {
            label: "House",
            data: [],
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
        };

        const rateDataset = {
            label: "My_rate",
            data: [],
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
        };

        labels.forEach((label) => {
            houseDataset.data.push((houseRates[label] * 100).toFixed(2));
            rateDataset.data.push((userRates[label] * 100).toFixed(2));
        });

        rateDataset.data.push((userRates.total * 100).toFixed(2));
        datasets.push(houseDataset);
        datasets.push(rateDataset);

        if (this.myChart) {
            this.myChart.data.labels = labels;
            this.myChart.data.datasets = datasets;
            this.myChart.options.plugins.title.text = locale.chartTitle;
            this.myChart.options.scales.y.ticks.stepSize = 20;
            this.myChart.update();
        } else {
            const ctx = this.$chartCanvas.getContext("2d");
            this.myChart = new Chart(
                ctx,
                {
                    type: "bar",
                    data: {
                        labels: labels,
                        datasets: datasets,
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: "Winning Rate (%)",
                                },
                                ticks: {
                                    stepSize: 20,
                                },
                            },
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: locale.chartTitle,
                                font: {
                                    size: 18,
                                },
                            },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        const datasetLabel =
                                            context.dataset.label || "";
                                        const value = context.parsed.y;
                                        return `${datasetLabel}: ${value.toFixed(
                                            2
                                        )}%`;
                                    },
                                },
                            },
                        },
                    },
                },
                500
            );
        }
    };

    this.render();
}

export default Home;
