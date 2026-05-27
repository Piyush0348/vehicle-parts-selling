export default class API {
    static BASE = "http://localhost:5033/api";

    static getToken() {
        return localStorage.getItem("token");
    }

    static headers() {
        return {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + this.getToken()
        };
    }

    static async get(url) {
        const res = await fetch(this.BASE + url, {
            headers: this.headers()
        });
        return res.json();
    }

    static async post(url, data) {
        const res = await fetch(this.BASE + url, {
            method: "POST",
            headers: this.headers(),
            body: JSON.stringify(data)
        });
        return res.json();
    }

    static async put(url, data) {
        const res = await fetch(this.BASE + url, {
            method: "PUT",
            headers: this.headers(),
            body: JSON.stringify(data)
        });
        return res.json();
    }

    static async delete(url) {
        return fetch(this.BASE + url, {
            method: "DELETE",
            headers: this.headers()
        });
    }
}