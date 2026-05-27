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

    if (!res.ok) throw new Error("Request failed");

    return res.json();
};

const loadStaffStats = async () => {
    try {
        const [
            customers,
            orders,
            revenue
        ] = await Promise.all([
            fetchWithAuth(`${API_BASE}/customers/count`),
            fetchWithAuth(`${API_BASE}/orders/count`),
            fetchWithAuth(`${API_BASE}/orders/total-amount`)
        ]);

        const recentOrders = await fetchWithAuth(`${API_BASE}/orders?page=1&pageSize=5`);

        document.getElementById("recent-orders").innerHTML =
            recentOrders.data.map(o => `
                <tr>
                    <td>${o.id}</td>
                    <td>Rs. ${o.totalAmount}</td>
                </tr>
            `).join("");

        document.getElementById("total-customers").innerText = customers.totalCustomers;
        document.getElementById("staff-total-orders").innerText = orders.totalOrders;
        document.getElementById("staff-total-revenue").innerText = "Rs. " + revenue.totalAmount;

    } catch (e) {
        console.error(e);
    }
};

loadStaffStats();