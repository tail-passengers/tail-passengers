import { $ } from "../utils/querySelector.js";

function Rank({ initialState }) {
    this.state = initialState;

    this.$element = document.createElement("div");
    this.$element.className = "content";

    this.fetchUsers = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8000/api/v1/users/", {
                credentials: 'include'
            });
            const data = await response.json();
            data.sort(
                (a, b) =>
                    b.win_count - b.lose_count < a.win_count - a.lose_count
            );
            this.setState(data);
            console.log(data);
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    this.renderUsers = (users) => {
        const tableRows = users
            .map(
                (data, index) => `
                    <tr>
                        <td class="h3 bold text-center align-middle col-1">${
                            index + 1
                        }</td>
                        <td class="text-center align-middle col-2"><img style="width:80%;" src="${
                            data.profile_image
                        }"></img></td>
                        <td class="h3 text-left align-middle col-1">${
                            data.nickname
                        }</td>
                        <td class="text-center align-middle col-3"></td>
                        <td class="h4 text-center align-middle">${
                            data.win_count
                        }</td>
                        <td class="h4 text-center align-middle">${
                            data.lose_count
                        }</td>
                        <td class="h4 text-center align-middle">${
                            data.win_count - data.lose_count
                        }</td>
                    </tr>
                    <tr style="height:3px;"></tr>
                `
            )
            .join("");

        const tableBody = this.$element.querySelector("tbody");
        tableBody.innerHTML = tableRows;
    };

    this.setState = (content) => {
        this.state = content;
        this.renderUsers(content);
    };

    this.render = () => {
        this.$element.innerHTML = `
            <div class="content default-container">
                <div class="container">
                    <div class="mb-3 mt-3">
                        <div class="h1 text-left tp-color-secondary">Top Player</div>
                        <div class="h3 text-left tp-color-primary">Thank you for playing</div>
                    </div>
                    <div class="row justify-content-center">
                        <div class="">
                            <div class="table-responsive" style="opacity:100%">
                                <table class="table table-dark table-responsive-md" style="border-spacing: 0 10px;">
                                    <thead>
                                        <tr class="text-center align-middle">
                                            <th class="tp-bgc-secondary">Rank</th>
                                            <th class="tp-bgc-secondary"></th>
                                            <th class="tp-bgc-secondary">User Name</th>
                                            <th class="tp-bgc-secondary"></th>
                                            <th class="tp-bgc-secondary">Wins</th>
                                            <th class="tp-bgc-secondary">Loses</th>
                                            <th class="tp-bgc-secondary">Rank-Point</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.fetchUsers();
    };

    this.init = () => {
        let parent = $("#app");
        const child = $(".content");
        if (child) {
            parent.removeChild(child);
            parent.appendChild(this.$element);
        }
        let body = $("body");
        const canvas = $("canvas");
        if (canvas) {
            body.removeChild(canvas);
        }
        this.render();
    };

    this.init();
}

export default Rank;