const CONFIG = Object.freeze({
    LOW_STOCK_URL:    "http://localhost:5033/api/notifications/low-stock",
    SEND_ALERT_URL:   "http://localhost:5033/api/notifications/low-stock/send-alert",
    OVERDUE_URL:      "http://localhost:5033/api/notifications/overdue",
    SEND_REMINDERS_URL: "http://localhost:5033/api/notifications/overdue/send-reminders"
});

const dom = Object.freeze({
    refreshBtn:       document.getElementById("refresh-btn"),
    sendAlertBtn:     document.getElementById("send-alert-btn"),
    alertBanner:      document.getElementById("alert-banner"),
    alertCount:       document.getElementById("alert-count"),
    stockTbody:       document.getElementById("stock-tbody"),
    noStockMsg:       document.getElementById("no-stock-msg"),
    overdueTbody:     document.getElementById("overdue-tbody"),
    noOverdueMsg:     document.getElementById("no-overdue-msg"),
    sendRemindersBtn: document.getElementById("send-reminders-btn"),
    emailDialog:      document.getElementById("email-dialog"),
    adminEmail:       document.getElementById("admin-email"),
    emailConfirm:     document.getElementById("email-confirm"),
    emailCancel:      document.getElementById("email-cancel"),
    successMsg:       document.getElementById("success-msg"),
    errorMsg:         document.getElementById("error-msg")
});

function getToken() {
    return localStorage.getItem("token");
}

function getAuthHeaders() {
    const token = getToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    return headers;
}

function formatPrice(amount) {
    return "Rs. " + Number(amount).toFixed(2);
}

function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function showSuccess(msg) {
    dom.successMsg.textContent   = msg;
    dom.successMsg.style.display = "block";
    dom.errorMsg.style.display   = "none";
    setTimeout(() => { dom.successMsg.style.display = "none"; }, 6000);
}

function showError(msg) {
    dom.errorMsg.textContent   = msg;
    dom.errorMsg.style.display = "block";
    dom.successMsg.style.display = "none";
}

function clearMessages() {
    dom.successMsg.style.display = "none";
    dom.errorMsg.style.display   = "none";
}

function stockClass(qty) {
    return qty === 0 ? "stock-critical" : "stock-warning";
}

function overdueClass(days) {
    return days > 60 ? "overdue-severe" : "overdue-moderate";
}

function stockToRow(item) {
    return `<tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.sku}</td>
        <td>${item.categoryName ?? "—"}</td>
        <td>${item.supplierName ?? "—"}</td>
        <td>${formatPrice(item.price)}</td>
        <td class="${stockClass(item.stockQty)}">
            ${item.stockQty}
        </td>
    </tr>`;
}

function overdueToRow(order) {
    return `<tr>
        <td>#${order.id}</td>
        <td>${order.customerName}</td>
        <td>${order.customerEmail}</td>
        <td>${formatDate(order.orderDate)}</td>
        <td>${formatPrice(order.amountOwed)}</td>
        <td class="${overdueClass(order.daysOverdue)}">
            ${order.daysOverdue} days
        </td>
    </tr>`;
}

function renderLowStock(data) {
    if (!data || data.count === 0) {
        dom.stockTbody.innerHTML      = "";
        dom.noStockMsg.style.display  = "block";
        dom.alertBanner.style.display = "none";
        return;
    }

    dom.noStockMsg.style.display  = "none";
    dom.alertBanner.style.display = "block";
    dom.alertCount.textContent    =
        `${data.count} part(s) below minimum stock threshold of ${data.threshold} units.`;
    dom.stockTbody.innerHTML      = data.items.map(stockToRow).join("");
}

function renderOverdue(data) {
    if (!data || data.count === 0) {
        dom.overdueTbody.innerHTML    = "";
        dom.noOverdueMsg.style.display = "block";
        return;
    }

    dom.noOverdueMsg.style.display = "none";
    dom.overdueTbody.innerHTML     = data.orders.map(overdueToRow).join("");
}

async function loadAll() {
    clearMessages();
    dom.refreshBtn.disabled    = true;
    dom.refreshBtn.textContent = "Loading…";

    try {
        const [stockData, overdueData] = await Promise.all([
            fetch(CONFIG.LOW_STOCK_URL, {
                headers: getAuthHeaders()
            }).then(res => {
                if (!res.ok) throw new Error("Failed to load low stock data. Status: " + res.status);
                return res.json();
            }),

            fetch(CONFIG.OVERDUE_URL, {
                headers: getAuthHeaders()
            }).then(res => {
                if (!res.ok) throw new Error("Failed to load overdue data. Status: " + res.status);
                return res.json();
            })
        ]);

        renderLowStock(stockData);
        renderOverdue(overdueData);

    } catch (err) {
        showError("Could not load data: " + err.message);
    } finally {
        dom.refreshBtn.disabled    = false;
        dom.refreshBtn.textContent = "Refresh";
    }
}

function openEmailDialog() {
    dom.adminEmail.value = "";
    dom.emailDialog.showModal();
}

async function handleSendAlert() {
    const email = dom.adminEmail.value.trim();
    if (!email) {
        return;
    }

    dom.emailConfirm.disabled    = true;
    dom.emailConfirm.textContent = "Sending…";

    try {
        const res = await fetch(CONFIG.SEND_ALERT_URL, {
            method:  "POST",
            headers: getAuthHeaders(),
            body:    JSON.stringify({ adminEmail: email })
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.message || "Failed to send.");

        dom.emailDialog.close();
        showSuccess(result.message);

    } catch (err) {
        dom.emailDialog.close();
        showError("Failed to send alert: " + err.message);
    } finally {
        dom.emailConfirm.disabled    = false;
        dom.emailConfirm.textContent = "Send Alert";
    }
}

async function handleSendReminders() {
    dom.sendRemindersBtn.disabled    = true;
    dom.sendRemindersBtn.textContent = "Sending…";

    try {
        const res = await fetch(CONFIG.SEND_REMINDERS_URL, {
            method:  "POST",
            headers: getAuthHeaders()
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.message || "Failed to send.");

        showSuccess(result.message);
        await loadAll();

    } catch (err) {
        showError("Failed to send reminders: " + err.message);
    } finally {
        dom.sendRemindersBtn.disabled    = false;
        dom.sendRemindersBtn.textContent = "Send Reminder Emails";
    }
}

function bindEvents() {
    dom.refreshBtn.addEventListener("click",     loadAll);
    dom.sendAlertBtn.addEventListener("click",   openEmailDialog);
    dom.emailConfirm.addEventListener("click",   handleSendAlert);
    dom.emailCancel.addEventListener("click",    () => dom.emailDialog.close());
    dom.sendRemindersBtn.addEventListener("click", handleSendReminders);
}

function init() {
    if (!getToken()) {
        window.location.href = "login.html";
        return;
    }
    bindEvents();
    loadAll();
}

init();