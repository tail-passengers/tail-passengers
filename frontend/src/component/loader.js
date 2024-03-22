export default function Loader() {
    const loadingScreen = document.createElement("div");
    loadingScreen.id = "loading-screen";
    loadingScreen.className = "loading-screen";
    loadingScreen.innerHTML = `
            <div class="loading-spinner"></div>
        `;
    document.body.appendChild(loadingScreen);

    let loading = true;

    const toggleLoadingScreen = () => {
        if (loading) {
            loadingScreen.style.display = "flex";
        } else {
            loadingScreen.style.display = "none";
        }
    };

    const simulateDataLoading = () => {
        setTimeout(() => {
            loading = false;
            toggleLoadingScreen();
        }, 2000);
    };

    simulateDataLoading();
}
