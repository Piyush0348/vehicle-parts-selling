import Auth from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {

    const nav = document.querySelector("nav");

    const role = Auth.getRole();

    if (!Auth.isAuthenticated()) {
        nav.innerHTML += `
            <div>
                <a href="login.html">Login</a>
                <a href="register.html">Register</a>
            </div>
        `;
        return;
    }

    let links = "";

    if (role === "Admin") {
        links = `
            <a href="admin-dashboard.html">Dashboard</a>
            <a href="admin-parts.html">Parts</a>
            <a href="admin-staff.html">Staff</a>
            <a href="admin-vendors.html">Vendors</a>
        `;
    }
    else if (role === "Staff") {
        links = `
            <a href="staff-search-customer.html">Search Customer</a>
            <a href="staff-sales.html">Sales</a>
            <a href="customer-register.html">Register Customer</a>
        `;
    }
    else {
        links = `
            <a href="index.html">Home</a>
            <a href="profile.html">Profile</a>
        `;
    }

    nav.innerHTML += `
        <div>
            ${links}
            <button id="logoutBtn">Logout</button>
        </div>
    `;

    document.getElementById("logoutBtn")
        .addEventListener("click", Auth.logout);
});