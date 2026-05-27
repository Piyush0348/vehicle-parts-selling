const API_BASE = "http://localhost:5033/api";

const Auth = {
    async login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            throw new Error("Login failed");
        }

        const data = await res.json();

        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);

        this.redirectByRole(data.role);
    },

    redirectByRole(role) {
        if (role === "Admin")
            window.location = "../html/admin-dashboard.html";
        else if (role === "Staff")
            window.location = "../html/staff-search-customer.html";
        else
            window.location = "../html/customer-register.html";
    },

    logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        window.location = "../html/login.html";
    },

    getToken() {
        return localStorage.getItem("token");
    },

    getRole() {
        return localStorage.getItem("role");
    },

    isAuthenticated() {
        return !!localStorage.getItem("token");
    },

    isLoggedIn() {
        return localStorage.getItem("token") !== null;
    }
};

export default Auth;