const CONFIG = Object.freeze({
    API_BASE: "http://localhost:5033/api",
    HISTORY_URL: (id) => `http://localhost:5033/api/customers/${id}/history`,
    SEND_INVOICE_URL: (orderId) => `http://localhost:5033/api/notifications/send-invoice/${orderId}`
});

const dom = Object.freeze({
    customerIdInput:   document.getElementById("customer-id-input"),
    loadBtn:           document.getElementById("load-history-btn"),

    customerInfoSection: document.getElementById("customer-info-section"),
    customerAvatar:    document.getElementById("customer-avatar"),
    customerName:      document.getElementById("customer-name"),
    customerEmail:     document.getElementById("customer-email"),
    customerPhone:     document.getElementById("customer-phone"),

    statOrders:        document.getElementById("stat-orders"),
    statSpent:         document.getElementById("stat-spent"),
    statVehicles:      document.getElementById("stat-vehicles"),
    statServices:      document.getElementById("stat-services"),
    statServiceCost:   document.getElementById("stat-service-cost"),

    tabBar:            document.getElementById("tab-bar"),
    tabPurchases:      document.getElementById("tab-purchases"),
    tabVehicles:       document.getElementById("tab-vehicles"),

    purchasesSection:  document.getElementById("purchases-section"),
    purchasesTbody:    document.getElementById("purchases-tbody"),
    noPurchasesMsg:    document.getElementById("no-purchases-msg"),

    orderDetailSection: document.getElementById("order-detail-section"),
    orderDetailId:     document.getElementById("order-detail-id"),
    orderItemsTbody:   document.getElementById("order-items-tbody"),
    closeDetailBtn:    document.getElementById("close-detail-btn"),

    vehiclesSection:   document.getElementById("vehicles-section"),
    vehicleList:       document.getElementById("vehicle-list"),
    noVehiclesMsg:     document.getElementById("no-vehicles-msg"),

    successMsg:        document.getElementById("success-msg"),
    errorMsg:          document.getElementById("error-msg")
});

const formatPrice = (amount) => `Rs. ${Number(amount).toFixed(2)}`;

const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getInitials = (name) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const statusClass = (status) => {
    const map = {
        paid:        "status-paid",
        pending:     "status-pending",
        shipped:     "status-shipped",
        cancelled:   "status-cancelled",
        completed:   "status-completed",
        inprogress:  "status-inprogress"
    };
    return map[status.toLowerCase().replace(/\s/g, "")] ?? "status-pending";
};

const createFetcher = (method) => async (url, body = null) => {
    const options = {
        method,
        headers: { "Content-Type": "application/json" }
    };
    if (body !== null) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Request failed with status ${response.status}`);
    }
    if (response.status === 204) return null;
    return response.json();
};

const fetchGet  = createFetcher("GET");
const fetchPost = createFetcher("POST");

const api = Object.freeze({
    getHistory:    (customerId) => fetchGet(CONFIG.HISTORY_URL(customerId)),
    sendInvoice:   (orderId) => fetchPost(CONFIG.SEND_INVOICE_URL(orderId))
});

let currentHistory = null;
let activeTab = "purchases";

const showSuccess = (msg) => {
    dom.successMsg.textContent = msg;
    dom.successMsg.style.display = "block";
    dom.errorMsg.style.display = "none";
    setTimeout(() => { dom.successMsg.style.display = "none"; }, 5000);
};

const showError = (msg) => {
    dom.errorMsg.textContent = msg;
    dom.errorMsg.style.display = "block";
    dom.successMsg.style.display = "none";
};

const clearMessages = () => {
    dom.errorMsg.textContent = "";
    dom.errorMsg.style.display = "none";
    dom.successMsg.style.display = "none";
};

const renderCustomerInfo = (history) => {
    dom.customerAvatar.textContent    = getInitials(history.customerName);
    dom.customerName.textContent      = history.customerName;
    dom.customerEmail.textContent     = history.email;
    dom.customerPhone.textContent     = history.phone ?? "—";
    dom.statOrders.textContent        = history.summary.totalOrders;
    dom.statSpent.textContent         = formatPrice(history.summary.totalSpent);
    dom.statVehicles.textContent      = history.summary.totalVehicles;
    dom.statServices.textContent      = history.summary.totalServiceVisits;
    dom.statServiceCost.textContent   = formatPrice(history.summary.totalServiceCost);
    dom.customerInfoSection.style.display = "block";
};

const purchaseToRowHtml = (order) =>
    `<tr>
        <td>#${order.orderId}</td>
        <td>${formatDate(order.orderDate)}</td>
        <td>${order.items.length}</td>
        <td>${formatPrice(order.totalAmount)}</td>
        <td><span class="status-badge ${statusClass(order.status)}">${order.status}</span></td>
        <td><button class="detail-btn" data-order-id="${order.orderId}">View Items</button></td>
        <td><button class="email-btn" data-order-id="${order.orderId}">Email Invoice</button></td>
    </tr>`;

const renderPurchases = (purchaseHistory) => {
    if (purchaseHistory.length === 0) {
        dom.purchasesTbody.innerHTML = "";
        dom.noPurchasesMsg.style.display = "block";
        return;
    }
    dom.noPurchasesMsg.style.display = "none";
    dom.purchasesTbody.innerHTML = purchaseHistory
        .map(purchaseToRowHtml)
        .reduce((html, row) => html + row, "");
};

const itemToRowHtml = (item) =>
    `<tr>
        <td>${item.productName}</td>
        <td>${formatPrice(item.unitPrice)}</td>
        <td>${item.quantity}</td>
        <td>${formatPrice(item.unitPrice * item.quantity)}</td>
    </tr>`;

const showOrderDetail = (orderId) => {
    const order = currentHistory.purchaseHistory.find((o) => o.orderId === orderId);
    if (!order) return;

    dom.orderDetailId.textContent = `#${order.orderId}`;
    dom.orderItemsTbody.innerHTML = order.items
        .map(itemToRowHtml)
        .reduce((html, row) => html + row, "");

    dom.purchasesSection.style.display  = "none";
    dom.orderDetailSection.style.display = "block";
};

const hideOrderDetail = () => {
    dom.orderDetailSection.style.display = "none";
    dom.purchasesSection.style.display   = "block";
};

const sendInvoiceEmail = async (orderId, btn) => {
    btn.disabled = true;
    btn.textContent = "Sending…";
    clearMessages();

    try {
        const result = await api.sendInvoice(orderId);
        showSuccess(result.message);
    } catch (err) {
        showError(`Failed to send invoice: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = "Email Invoice";
    }
};

const serviceToRowHtml = (sr) =>
    `<tr>
        <td>${formatDate(sr.serviceDate)}</td>
        <td>${sr.serviceType}</td>
        <td>${sr.description ?? "—"}</td>
        <td>${formatPrice(sr.totalCost)}</td>
        <td><span class="status-badge ${statusClass(sr.status)}">${sr.status}</span></td>
    </tr>`;

const vehicleToCardHtml = (vehicle) => {
    const serviceRows = vehicle.serviceHistory.length
        ? vehicle.serviceHistory.map(serviceToRowHtml).join("")
        : `<tr><td colspan="5" class="vehicle-no-service">No service records for this vehicle.</td></tr>`;

    return `<div class="vehicle-card">
        <div class="vehicle-card-header">
            <span class="vehicle-icon">🚗</span>
            <div class="vehicle-meta">
                <strong>${vehicle.vehicleMake} ${vehicle.vehicleModel} (${vehicle.manufacturingYear})</strong>
                <span>${vehicle.vehicleNumber}${vehicle.color ? " · " + vehicle.color : ""}</span>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Service Type</th>
                    <th>Notes</th>
                    <th>Cost</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>${serviceRows}</tbody>
        </table>
    </div>`;
};

const renderVehicles = (vehicles) => {
    if (vehicles.length === 0) {
        dom.vehicleList.innerHTML = "";
        dom.noVehiclesMsg.style.display = "block";
        return;
    }
    dom.noVehiclesMsg.style.display = "none";
    dom.vehicleList.innerHTML = vehicles
        .map(vehicleToCardHtml)
        .reduce((html, card) => html + card, "");
};

const switchTab = (tab) => {
    activeTab = tab;
    dom.tabPurchases.classList.toggle("active", tab === "purchases");
    dom.tabVehicles.classList.toggle("active",  tab === "vehicles");

    dom.purchasesSection.style.display  = tab === "purchases" ? "block" : "none";
    dom.vehiclesSection.style.display   = tab === "vehicles"  ? "block" : "none";
    dom.orderDetailSection.style.display = "none";
};

const loadHistory = async () => {
    clearMessages();

    const rawId = dom.customerIdInput.value.trim();
    if (!rawId || isNaN(Number(rawId)) || Number(rawId) < 1) {
        showError("Please enter a valid Customer ID.");
        return;
    }

    const customerId = parseInt(rawId, 10);
    dom.loadBtn.disabled    = true;
    dom.loadBtn.textContent = "Loading…";

    try {
        const history = await api.getHistory(customerId);
        currentHistory = history;

        renderCustomerInfo(history);
        renderPurchases(history.purchaseHistory);
        renderVehicles(history.vehicles);

        dom.tabBar.style.display = "flex";
        switchTab("purchases");

    } catch (err) {
        showError(`Could not load history: ${err.message}`);
        dom.customerInfoSection.style.display   = "none";
        dom.tabBar.style.display                = "none";
        dom.purchasesSection.style.display      = "none";
        dom.vehiclesSection.style.display       = "none";
        dom.orderDetailSection.style.display    = "none";
    } finally {
        dom.loadBtn.disabled    = false;
        dom.loadBtn.textContent = "View History";
    }
};

const handlePurchasesClick = (event) => {
    const detailBtn = event.target.closest(".detail-btn");
    if (detailBtn) {
        const orderId = parseInt(detailBtn.dataset.orderId, 10);
        showOrderDetail(orderId);
        return;
    }

    const emailBtn = event.target.closest(".email-btn");
    if (emailBtn) {
        const orderId = parseInt(emailBtn.dataset.orderId, 10);
        sendInvoiceEmail(orderId, emailBtn);
    }
};

const bindEvents = () => {
    dom.loadBtn.addEventListener("click", loadHistory);

    dom.customerIdInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") loadHistory();
    });

    dom.tabPurchases.addEventListener("click", () => switchTab("purchases"));
    dom.tabVehicles.addEventListener("click",  () => switchTab("vehicles"));

    dom.purchasesTbody.addEventListener("click", handlePurchasesClick);
    dom.closeDetailBtn.addEventListener("click", hideOrderDetail);
};

const init = () => {
    bindEvents();
};

init();