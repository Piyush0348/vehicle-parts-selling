if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
}

const API_BASE = "http://localhost:5033/api";

const fetchWithAuth = async (url) => {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });
    if (!res.ok) throw new Error("Request failed: " + url);
    return res.json();
};

const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
};

const loadStats = async () => {
    try {
        const [products, lowStock] = await Promise.all([
            fetchWithAuth(`${API_BASE}/products/count`),
            fetchWithAuth(`${API_BASE}/products/low-stock`)
        ]);

        set("total-products", products.totalProducts ?? "N/A");
        set("low-stock-count", Array.isArray(lowStock) ? lowStock.length : "N/A");

        const badge = document.getElementById("low-stock-badge");
        const tbody = document.getElementById("low-stock-table");
        const emptyState = document.getElementById("no-low-stock");

        if (Array.isArray(lowStock) && lowStock.length > 0) {
            if (badge) badge.textContent = `${lowStock.length} items`;
            if (emptyState) emptyState.classList.add("hidden");
            if (tbody) {
                tbody.innerHTML = lowStock.slice(0, 5).map(p => `
                    <tr>
                        <td>${p.name}</td>
                        <td><span class="stock-low">${p.stockQty}</span></td>
                    </tr>
                `).join("");
            }
        } else {
            if (badge) badge.textContent = "0 items";
            if (tbody) tbody.innerHTML = "";
            if (emptyState) emptyState.classList.remove("hidden");
        }

    } catch (e) {
        console.error("Failed to load product stats:", e);
    }

    try {
        const orders = await fetchWithAuth(`${API_BASE}/orders?page=1&pageSize=1`);
        set("total-orders", orders.totalCount ?? "N/A");
    } catch (e) {
        console.error("Failed to load order stats:", e);
        set("total-orders", "N/A");
    }

    try {
        const allOrders = await fetchWithAuth(`${API_BASE}/orders?page=1&pageSize=1000`);
        if (allOrders.data && Array.isArray(allOrders.data)) {
            const total = allOrders.data.reduce((sum, o) => sum + o.totalAmount, 0);
            set("total-revenue", "Rs. " + total.toFixed(2));
        }
    } catch (e) {
        console.error("Failed to load revenue:", e);
        set("total-revenue", "N/A");
    }
};

loadStats();