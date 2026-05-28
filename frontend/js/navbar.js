import Auth from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Dynamic CSS Style Injection for absolute navigation styling consistency
    if (!document.getElementById("global-nav-styles")) {
        const style = document.createElement("style");
        style.id = "global-nav-styles";
        style.textContent = `
            nav.global-nav {
                display: block !important;
                position: sticky !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                z-index: 99999 !important;
                background: #072a40 !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
                font-family: 'Outfit', 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif !important;
                box-sizing: border-box !important;
            }
            .nav-shell {
                max-width: 1280px !important;
                margin: 0 auto !important;
                padding: 10px 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                flex-wrap: wrap !important;
                gap: 16px !important;
                box-sizing: border-box !important;
            }
            .nav-brand {
                display: inline-flex !important;
                align-items: center !important;
                gap: 10px !important;
                color: #fff !important;
                text-decoration: none !important;
                font-weight: 700 !important;
                transition: transform 0.2s ease !important;
            }
            .nav-brand:hover {
                transform: scale(1.02) !important;
            }
            .nav-brand-mark {
                width: 36px !important;
                height: 36px !important;
                border-radius: 10px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: linear-gradient(135deg, #ffb703, #fb7185) !important;
                color: #06253a !important;
                font-weight: 800 !important;
                font-size: 0.95rem !important;
                letter-spacing: 0.04em !important;
            }
            .nav-brand-text {
                font-size: 1.15rem !important;
                font-weight: 800 !important;
                letter-spacing: 0.02em !important;
                color: #fff !important;
            }
            .nav-links-container {
                display: flex !important;
                align-items: center !important;
                gap: 6px !important;
                flex-wrap: wrap !important;
            }
            .nav-link-item {
                color: #94a3b8 !important;
                text-decoration: none !important;
                font-size: 0.9rem !important;
                font-weight: 600 !important;
                padding: 8px 14px !important;
                border-radius: 999px !important;
                transition: all 0.2s ease !important;
            }
            .nav-link-item:hover {
                color: #fff !important;
                background: rgba(255, 255, 255, 0.06) !important;
                transform: translateY(-1px) !important;
            }
            .nav-link-item.active {
                color: #fff !important;
                background: rgba(255, 255, 255, 0.12) !important;
                font-weight: 700 !important;
            }
            .nav-role-tag {
                display: inline-flex !important;
                align-items: center !important;
                padding: 6px 12px !important;
                border-radius: 999px !important;
                font-size: 0.72rem !important;
                font-weight: 700 !important;
                letter-spacing: 0.05em !important;
                text-transform: uppercase !important;
                color: #fff !important;
                margin-right: 8px !important;
            }
            .nav-role-admin {
                background: rgba(239, 68, 68, 0.2) !important;
                color: #fca5a5 !important;
                border: 1px solid rgba(239, 68, 68, 0.3) !important;
            }
            .nav-role-staff {
                background: rgba(16, 185, 129, 0.2) !important;
                color: #a7f3d0 !important;
                border: 1px solid rgba(16, 185, 129, 0.3) !important;
            }
            .nav-role-customer {
                background: rgba(37, 99, 235, 0.2) !important;
                color: #bfdbfe !important;
                border: 1px solid rgba(37, 99, 235, 0.3) !important;
            }
            .nav-logout-btn-item {
                padding: 8px 16px !important;
                background: rgba(239, 68, 68, 0.15) !important;
                color: #fca5a5 !important;
                border: 1px solid rgba(239, 68, 68, 0.3) !important;
                border-radius: 999px !important;
                font-size: 0.82rem !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                font-family: inherit !important;
                margin-left: 6px !important;
            }
            .nav-logout-btn-item:hover {
                background: #ef4444 !important;
                color: white !important;
                border-color: #ef4444 !important;
                transform: translateY(-1px) !important;
            }
            @media (max-width: 900px) {
                .nav-shell {
                    justify-content: center !important;
                }
                .nav-links-container {
                    justify-content: center !important;
                    width: 100% !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Select or Prepend the navigation element
    let nav = document.querySelector("nav");
    if (!nav) {
        nav = document.createElement("nav");
        document.body.insertBefore(nav, document.body.firstChild);
    }
    nav.className = "global-nav";

    const role = Auth.getRole();
    const currentPath = window.location.pathname;

    const isActive = (href) => {
        return currentPath.includes(href);
    };

    const link = (href, label) => {
        const activeClass = isActive(href) ? "active" : "";
        return `<a href="${href}" class="nav-link-item ${activeClass}">${label}</a>`;
    };

    if (!Auth.isAuthenticated()) {
        nav.innerHTML = `
            <div class="nav-shell">
                <a class="nav-brand" href="index.html">
                    <span class="nav-brand-mark">AS</span>
                    <span class="nav-brand-text">AutoServe</span>
                </a>
                <div class="nav-links-container">
                    ${link("login.html", "Login")}
                    ${link("register.html", "Register")}
                </div>
            </div>
        `;
        return;
    }

    let links = "";
    let badge = "";

    if (role === "Admin") {
        badge = `<span class="nav-role-tag nav-role-admin">Admin</span>`;
        links = `
            ${link("admin-dashboard.html", "Dashboard")}
            ${link("admin-parts.html", "Parts")}
            ${link("admin-staff.html", "Staff")}
            ${link("admin-vendors.html", "Vendors")}
            ${link("admin-low-stock.html", "Low Stock")}
        `;
    } else if (role === "Staff") {
        badge = `<span class="nav-role-tag nav-role-staff">Staff</span>`;
        links = `
            ${link("staff-search-customer.html", "Search Customer")}
            ${link("staff-customer-register.html", "Register Customer")}
            ${link("staff-sales.html", "Sales")}
        `;
    } else {
        badge = `<span class="nav-role-tag nav-role-customer">Customer</span>`;
        links = `
            ${link("index.html", "Home")}
            ${link("appointments.html", "Appointments")}
            ${link("part-requests.html", "Part Requests")}
            ${link("reviews.html", "Reviews")}
            ${link("customer-history.html", "History")}
            ${link("ai-prediction.html", "AI Prediction")}
            ${link("profile.html", "Profile")}
        `;
    }

    nav.innerHTML = `
        <div class="nav-shell">
            <a class="nav-brand" href="index.html">
                <span class="nav-brand-mark">AS</span>
                <span class="nav-brand-text">AutoServe</span>
            </a>
            <div class="nav-links-container">
                ${badge}
                ${links}
                <button id="logoutBtn" class="nav-logout-btn-item">Logout</button>
            </div>
        </div>
    `;

    document.getElementById("logoutBtn").addEventListener("click", (e) => {
        e.preventDefault();
        Auth.logout();
    });
});