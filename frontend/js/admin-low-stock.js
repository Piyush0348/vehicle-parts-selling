const CONFIG = Object.freeze({
    LOW_STOCK_URL: "http://localhost:5033/api/notifications/low-stock",
    SEND_ALERT_URL: "http://localhost:5033/api/notifications/low-stock/send-alert",
    OVERDUE_URL: "http://localhost:5033/api/notifications/overdue-credits",
    SEND_REMINDERS_URL: "http://localhost:5033/api/notifications/overdue-credits/send-reminders"
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

const formatPrice = (amount) => `Rs. ${Number(amount).toFixed(2)}`;

const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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
    getLowStock:     () => fetchGet(CONFIG.LOW_STOCK_URL),
    sendAlert:       (email) => fetchPost(CONFIG.SEND_ALERT_URL, { adminEmail: email }),
    getOverdue:      () => fetchGet(CONFIG.OVERDUE_URL),
    sendReminders:   () => fetchPost(CONFIG.SEND_REMINDERS_URL)
});

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
    dom.successMsg.style.display = "none";
    dom.errorMsg.style.display = "none";
};

const stockClass = (qty) => qty <= 3 ? "stock-critical" : "stock-warning";

const overdueClass = (days) => days > 60 ? "overdue-severe" : "overdue-moderate";

const stockToRowHtml = (item) =>
    `<tr>
        <td>${item.id}</td>
        <td>${item.name}</td>
        <td>${item.sku}</td>
        <td>${item.categoryName}</td>
        <td>${item.supplierName}</td>
        <td>${formatPrice(item.price)}</td>
        <td class="${stockClass(item.stockQty)}">${item.stockQty}</td>
    </tr>`;

const overdueToRowHtml = (order) =>
    `<tr>
        <td>#${order.id}</td>
        <td>${order.customerName}</td>
        <td>${order.customerEmail}</td>
        <td>${formatDate(order.orderDate)}</td>
        <td>${formatPrice(order.amountOwed)}</td>
        <td class="${overdueClass(order.daysOverdue)}">${order.daysOverdue} days</td>
    </tr>`;

const renderLowStock = (data) => {
    if (data.count === 0) {
        dom.stockTbody.innerHTML = "";
        dom.noStockMsg.style.display = "block";
        dom.alertBanner.style.display = "none";
        return;
    }

    dom.noStockMsg.style.display = "none";
    dom.alertBanner.style.display = "block";
    dom.alertCount.textContent = `${data.count} part(s) below minimum stock threshold of ${data.threshold} units.`;

    dom.stockTbody.innerHTML = data.items
        .map(stockToRowHtml)
        .reduce((html, row) => html + row, "");
};

const renderOverdue = (data) => {
    if (data.count === 0) {
        dom.overdueTbody.innerHTML = "";
        dom.noOverdueMsg.style.display = "block";
        return;
    }

    dom.noOverdueMsg.style.display = "none";
    dom.overdueTbody.innerHTML = data.orders
        .map(overdueToRowHtml)
        .reduce((html, row) => html + row, "");
};

const loadAll = async () => {
    clearMessages();
    dom.refreshBtn.disabled = true;
    dom.refreshBtn.textContent = "Loading…";

    try {
        const [stockData, overdueData] = await Promise.all([
            api.getLowStock(),
            api.getOverdue()
        ]);

        renderLowStock(stockData);
        renderOverdue(overdueData);
    } catch (err) {
        showError(`Could not load data: ${err.message}`);
    } finally {
        dom.refreshBtn.disabled = false;
        dom.refreshBtn.textContent = "Refresh";
    }
};

const openEmailDialog = () => {
    dom.adminEmail.value = "";
    dom.emailDialog.showModal();
};

const handleSendAlert = async () => {
    const email = dom.adminEmail.value.trim();
    if (!email) return;

    dom.emailConfirm.disabled = true;
    dom.emailConfirm.textContent = "Sending…";

    try {
        const result = await api.sendAlert(email);
        dom.emailDialog.close();
        showSuccess(result.message);
    } catch (err) {
        dom.emailDialog.close();
        showError(`Failed to send alert: ${err.message}`);
    } finally {
        dom.emailConfirm.disabled = false;
        dom.emailConfirm.textContent = "Send Alert";
    }
};

const handleSendReminders = async () => {
    dom.sendRemindersBtn.disabled = true;
    dom.sendRemindersBtn.textContent = "Sending…";

    try {
        const result = await api.sendReminders();
        showSuccess(result.message);
    } catch (err) {
        showError(`Failed to send reminders: ${err.message}`);
    } finally {
        dom.sendRemindersBtn.disabled = false;
        dom.sendRemindersBtn.textContent = "Send Reminder Emails";
    }
};

const bindEvents = () => {
    dom.refreshBtn.addEventListener("click", loadAll);
    dom.sendAlertBtn.addEventListener("click", openEmailDialog);
    dom.emailConfirm.addEventListener("click", handleSendAlert);
    dom.emailCancel.addEventListener("click", () => dom.emailDialog.close());
    dom.sendRemindersBtn.addEventListener("click", handleSendReminders);
};

const init = () => {
    bindEvents();
    loadAll();
};

init();