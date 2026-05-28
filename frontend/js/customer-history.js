import RBAC from "./rbac.js";

const CONFIG = Object.freeze({
    HISTORY_URL:      (id) =>
        `http://localhost:5033/api/customers/${id}/history`,
    SEND_INVOICE_URL: (orderId) =>
        `http://localhost:5033/api/notifications/send-invoice/${orderId}`
});

const dom = Object.freeze({
    customerInfoSection: document.getElementById("customer-info-section"),
    customerAvatar:      document.getElementById("customer-avatar"),
    customerName:        document.getElementById("customer-name"),
    customerEmail:       document.getElementById("customer-email"),
    customerPhone:       document.getElementById("customer-phone"),
    statOrders:          document.getElementById("stat-orders"),
    statSpent:           document.getElementById("stat-spent"),
    statVehicles:        document.getElementById("stat-vehicles"),
    statServices:        document.getElementById("stat-services"),
    statServiceCost:     document.getElementById("stat-service-cost"),
    tabBar:              document.getElementById("tab-bar"),
    tabPurchases:        document.getElementById("tab-purchases"),
    tabVehicles:         document.getElementById("tab-vehicles"),
    purchasesSection:    document.getElementById("purchases-section"),
    purchasesTbody:      document.getElementById("purchases-tbody"),
    noPurchasesMsg:      document.getElementById("no-purchases-msg"),
    orderDetailSection:  document.getElementById("order-detail-section"),
    orderDetailId:       document.getElementById("order-detail-id"),
    orderItemsTbody:     document.getElementById("order-items-tbody"),
    closeDetailBtn:      document.getElementById("close-detail-btn"),
    vehiclesSection:     document.getElementById("vehicles-section"),
    vehicleList:         document.getElementById("vehicle-list"),
    noVehiclesMsg:       document.getElementById("no-vehicles-msg"),
    successMsg:          document.getElementById("success-msg"),
    errorMsg:            document.getElementById("error-msg")
});

let currentHistory = null;

function getAuthHeaders() {
    const token = RBAC.getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    return headers;
}

function getLoggedInCustomerId() {
    const id     = RBAC.getUserId();
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? null : parsed;
}

function formatPrice(amount) {
    return "Rs. " + Number(amount).toFixed(2);
}

function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function getInitials(name) {
    return name.split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function statusClass(status) {
    const map = {
        paid:       "status-paid",
        pending:    "status-pending",
        shipped:    "status-shipped",
        cancelled:  "status-cancelled",
        completed:  "status-completed",
        inprogress: "status-inprogress"
    };
    return map[(status || "").toLowerCase().replace(/\s/g, "")] ||
           "status-pending";
}

function showSuccess(msg) {
    dom.successMsg.textContent   = msg;
    dom.successMsg.style.display = "block";
    dom.errorMsg.style.display   = "none";
    setTimeout(() => {
        dom.successMsg.style.display = "none";
    }, 5000);
}

function showError(msg) {
    dom.errorMsg.textContent   = msg;
    dom.errorMsg.style.display = "block";
    dom.successMsg.style.display = "none";
}

function clearMessages() {
    dom.errorMsg.style.display   = "none";
    dom.successMsg.style.display = "none";
}

function renderCustomerInfo(history) {
    dom.customerAvatar.textContent  = getInitials(history.customerName);
    dom.customerName.textContent    = history.customerName;
    dom.customerEmail.textContent   = history.email;
    dom.customerPhone.textContent   = history.phone || "—";
    dom.statOrders.textContent      = history.summary.totalOrders;
    dom.statSpent.textContent       = formatPrice(history.summary.totalSpent);
    dom.statVehicles.textContent    = history.summary.totalVehicles;
    dom.statServices.textContent    = history.summary.totalServiceVisits;
    dom.statServiceCost.textContent =
        formatPrice(history.summary.totalServiceCost);
    dom.customerInfoSection.style.display = "block";
}

function purchaseToRow(order) {
    return `<tr>
        <td>#${order.orderId}</td>
        <td>${formatDate(order.orderDate)}</td>
        <td>${order.items.length}</td>
        <td>${formatPrice(order.totalAmount)}</td>
        <td>
            <span class="status-badge ${statusClass(order.status)}">
                ${order.status}
            </span>
        </td>
        <td>
            <button class="detail-btn"
                    data-order-id="${order.orderId}">
                View Items
            </button>
        </td>
    </tr>`;
}

function renderPurchases(purchaseHistory) {
    if (purchaseHistory.length === 0) {
        dom.purchasesTbody.innerHTML  = "";
        dom.noPurchasesMsg.style.display = "block";
        return;
    }
    dom.noPurchasesMsg.style.display = "none";
    dom.purchasesTbody.innerHTML =
        purchaseHistory.map(purchaseToRow).join("");
}

function showOrderDetail(orderId) {
    if (!currentHistory) return;
    const order = currentHistory.purchaseHistory.find(
        o => o.orderId === orderId
    );
    if (!order) return;

    dom.orderDetailId.textContent = `#${order.orderId}`;
    dom.orderItemsTbody.innerHTML = order.items.map(item => `
        <tr>
            <td>${item.productName}</td>
            <td>${formatPrice(item.unitPrice)}</td>
            <td>${item.quantity}</td>
            <td>${formatPrice(item.unitPrice * item.quantity)}</td>
        </tr>`).join("");

    dom.purchasesSection.style.display  = "none";
    dom.orderDetailSection.style.display = "block";
}

function hideOrderDetail() {
    dom.orderDetailSection.style.display = "none";
    dom.purchasesSection.style.display   = "block";
}

function sendInvoiceEmail(orderId, btn) {
    btn.disabled    = true;
    btn.textContent = "Sending…";
    clearMessages();

    fetch(CONFIG.SEND_INVOICE_URL(orderId), {
        method:  "POST",
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to send invoice.");
        return res.json();
    })
    .then(result => showSuccess(result.message || "Invoice sent!"))
    .catch(err  => showError("Failed to send invoice: " + err.message))
    .finally(() => {
        btn.disabled    = false;
        btn.textContent = "Email Invoice";
    });
}

function serviceToRow(sr) {
    return `<tr>
        <td>${formatDate(sr.serviceDate)}</td>
        <td>${sr.serviceType}</td>
        <td>${sr.description || "—"}</td>
        <td>${formatPrice(sr.totalCost)}</td>
        <td>
            <span class="status-badge ${statusClass(sr.status)}">
                ${sr.status}
            </span>
        </td>
    </tr>`;
}

function vehicleToCard(vehicle) {
    const serviceRows = vehicle.serviceHistory.length
        ? vehicle.serviceHistory.map(serviceToRow).join("")
        : `<tr>
               <td colspan="5" class="vehicle-no-service">
                   No service records for this vehicle.
               </td>
           </tr>`;

    return `<div class="vehicle-card">
        <div class="vehicle-card-header">
            <span class="vehicle-icon">🚗</span>
            <div class="vehicle-meta">
                <strong>
                    ${vehicle.vehicleMake} ${vehicle.vehicleModel}
                    (${vehicle.manufacturingYear})
                </strong>
                <span>
                    ${vehicle.vehicleNumber}
                    ${vehicle.color ? "· " + vehicle.color : ""}
                </span>
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
}

function renderVehicles(vehicles) {
    if (vehicles.length === 0) {
        dom.vehicleList.innerHTML     = "";
        dom.noVehiclesMsg.style.display = "block";
        return;
    }
    dom.noVehiclesMsg.style.display = "none";
    dom.vehicleList.innerHTML       = vehicles.map(vehicleToCard).join("");
}

function switchTab(tab) {
    dom.tabPurchases.classList.toggle("active", tab === "purchases");
    dom.tabVehicles.classList.toggle("active",  tab === "vehicles");
    dom.purchasesSection.style.display  =
        tab === "purchases" ? "block" : "none";
    dom.vehiclesSection.style.display   =
        tab === "vehicles"  ? "block" : "none";
    dom.orderDetailSection.style.display = "none";
}

function loadHistory(customerId) {
    clearMessages();

    fetch(CONFIG.HISTORY_URL(customerId), {
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(err.message || "Failed to load history.");
            });
        }
        return res.json();
    })
    .then(history => {
        currentHistory = history;
        renderCustomerInfo(history);
        renderPurchases(history.purchaseHistory);
        renderVehicles(history.vehicles);
        dom.tabBar.style.display = "flex";
        switchTab("purchases");
    })
    .catch(err => {
        showError("Could not load history: " + err.message);
        dom.customerInfoSection.style.display  = "none";
        dom.tabBar.style.display               = "none";
        dom.purchasesSection.style.display     = "none";
        dom.vehiclesSection.style.display      = "none";
        dom.orderDetailSection.style.display   = "none";
    });
}

function handlePurchasesClick(e) {
    const detailBtn = e.target.closest(".detail-btn");
    if (detailBtn) {
        showOrderDetail(parseInt(detailBtn.dataset.orderId, 10));
    }
}
function init() {
    const customerIdInput = document.getElementById("customer-id-input");
    const loadBtn         = document.getElementById("load-history-btn");
    if (customerIdInput) customerIdInput.remove();
    if (loadBtn)         loadBtn.remove();

    const customerId = getLoggedInCustomerId();

    if (!customerId) {
        showError("Please log in to view your history.");
        return;
    }

    dom.tabPurchases.addEventListener("click",
        () => switchTab("purchases"));
    dom.tabVehicles.addEventListener("click",
        () => switchTab("vehicles"));
    dom.purchasesTbody.addEventListener("click", handlePurchasesClick);
    dom.closeDetailBtn.addEventListener("click", hideOrderDetail);

    loadHistory(customerId);
}

init();