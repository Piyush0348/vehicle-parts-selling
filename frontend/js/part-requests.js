import RBAC from "./rbac.js";

const CONFIG = Object.freeze({
    API_BASE: "http://localhost:5033/api",
    REQUESTS_URL: "http://localhost:5033/api/part-requests",
    CUSTOMER_REQUESTS: (id) => `http://localhost:5033/api/part-requests/customer/${id}`,
    CUSTOMER_DETAIL: (id) => `http://localhost:5033/api/customers/${id}`
});

const dom = Object.freeze({
    customerIdInput: document.getElementById("customer-id-input"),
    loadBtn: document.getElementById("load-btn"),
    openFormBtn: document.getElementById("open-form-btn"),

    tableSection: document.getElementById("requests-table-section"),
    tbody: document.getElementById("requests-tbody"),
    noMsg: document.getElementById("no-requests-msg"),

    formSection: document.getElementById("form-section"),
    formHeading: document.getElementById("form-heading"),
    form: document.getElementById("request-form"),
    requestId: document.getElementById("request-id"),
    partName: document.getElementById("part-name"),
    partNumber: document.getElementById("part-number"),
    vehicleSelect: document.getElementById("vehicle-select"),
    description: document.getElementById("part-description"),
    submitBtn: document.getElementById("submit-btn"),
    cancelBtn: document.getElementById("cancel-btn"),

    confirmDialog: document.getElementById("confirm-dialog"),
    confirmYes: document.getElementById("confirm-yes"),
    confirmNo: document.getElementById("confirm-no"),

    errorMsg: document.getElementById("error-msg")
});

const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const statusClass = (status) => {
    const map = {
        pending: "status-pending",
        approved: "status-approved",
        fulfilled: "status-fulfilled",
        rejected: "status-rejected"
    };
    return map[status.toLowerCase()] ?? "status-pending";
};

const createFetcher = (method) => async (url, body = null) => {
    const token = RBAC.getToken();
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": "Bearer " + token } : {})
        }
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
};

const fetchGet = createFetcher("GET");
const fetchPost = createFetcher("POST");
const fetchPut = createFetcher("PUT");
const fetchDelete = createFetcher("DELETE");

const api = Object.freeze({
    getAll: () => fetchGet(CONFIG.REQUESTS_URL),
    getByCustomer: (id) => fetchGet(CONFIG.CUSTOMER_REQUESTS(id)),
    getCustomer: (id) => fetchGet(CONFIG.CUSTOMER_DETAIL(id)),
    getById: (id) => fetchGet(`${CONFIG.REQUESTS_URL}/${id}`),
    create: (data) => fetchPost(CONFIG.REQUESTS_URL, data),
    update: (id, data) => fetchPut(`${CONFIG.REQUESTS_URL}/${id}`, data),
    remove: (id) => fetchDelete(`${CONFIG.REQUESTS_URL}/${id}`)
});

let currentCustomerId = null;
let currentVehicles = [];
let deleteTargetId = null;

const showError = (msg) => {
    dom.errorMsg.textContent = msg;
    dom.errorMsg.style.display = "block";
};

const clearError = () => {
    dom.errorMsg.textContent = "";
    dom.errorMsg.style.display = "none";
};

const getCustomerId = () => {
    const raw = dom.customerIdInput.value.trim();
    if (!raw || isNaN(Number(raw)) || Number(raw) < 1) return null;
    return parseInt(raw, 10);
};

const requestToRowHtml = (r) =>
    `<tr>
        <td>${r.id}</td>
        <td>${r.partName}</td>
        <td>${r.partNumber ?? "—"}</td>
        <td>${r.vehicleNumber}</td>
        <td>${r.description ?? "—"}</td>
        <td><span class="status-badge ${statusClass(r.status)}">${r.status}</span></td>
        <td>${formatDate(r.createdAt)}</td>
        <td>${r.customerName}</td>
        <td class="actions">
            <button class="edit-btn" data-id="${r.id}">Edit</button>
            <button class="delete-btn" data-id="${r.id}">Delete</button>
        </td>
    </tr>`;

const renderTable = (requests) => {
    if (requests.length === 0) {
        dom.tbody.innerHTML = "";
        dom.noMsg.style.display = "block";
        return;
    }

    dom.noMsg.style.display = "none";
    dom.tbody.innerHTML = requests
        .map(requestToRowHtml)
        .reduce((html, row) => html + row, "");
};

const populateVehicleSelect = (vehicles) => {
    const defaultOption = `<option value="">Select vehicle</option>`;
    const vehicleOptions = vehicles
        .map((v) => `<option value="${v.id}">${v.vehicleNumber} - ${v.vehicleMake} ${v.vehicleModel}</option>`)
        .reduce((html, opt) => html + opt, "");

    dom.vehicleSelect.innerHTML = defaultOption + vehicleOptions;
};

const loadAll = async () => {
    clearError();

    try {
        const requests = await api.getAll();
        renderTable(requests);
        dom.tableSection.style.display = "block";
    } catch (err) {
        showError(`Could not load part requests: ${err.message}`);
    }
};

const loadByCustomer = async (customerId = getCustomerId()) => {
    clearError();

    if (!customerId) {
        showError("Please enter a valid Customer ID.");
        return;
    }

    dom.loadBtn.disabled = true;
    dom.loadBtn.textContent = "Loading…";

    try {
        const customer = await api.getCustomer(customerId);
        currentCustomerId = customerId;
        currentVehicles = customer.vehicles || [];
        populateVehicleSelect(currentVehicles);

        const requests = await api.getByCustomer(customerId);
        renderTable(requests);
        dom.tableSection.style.display = "block";
    } catch (err) {
        showError(`Could not load part requests: ${err.message}`);
    } finally {
        dom.loadBtn.disabled = false;
        dom.loadBtn.textContent = "Load";
    }
};

const showForm = (heading, submitLabel) => {
    dom.formHeading.textContent = heading;
    dom.submitBtn.textContent = submitLabel;
    dom.formSection.style.display = "block";
    dom.tableSection.style.display = "none";
};

const hideForm = () => {
    dom.form.reset();
    dom.requestId.value = "";
    dom.formSection.style.display = "none";
    dom.tableSection.style.display = "block";
};

const openCreateForm = () => {
    if (!currentCustomerId) {
        showError("Please enter a Customer ID and click Load first to submit a request.");
        return;
    }

    if (currentVehicles.length === 0) {
        showError("This customer has no vehicles registered.");
        return;
    }

    hideForm();
    showForm("Request Unavailable Part", "Submit Request");
};

const openEditForm = async (id) => {
    try {
        const request = await api.getById(id);
        const customer = await api.getCustomer(request.customerId);

        currentCustomerId = request.customerId;
        currentVehicles = customer.vehicles || [];
        populateVehicleSelect(currentVehicles);

        dom.requestId.value = request.id;
        dom.partName.value = request.partName;
        dom.partNumber.value = request.partNumber ?? "";
        dom.description.value = request.description ?? "";
        dom.vehicleSelect.value = String(request.vehicleId);

        showForm("Edit Part Request", "Update Request");
    } catch (err) {
        showError(`Could not load part request: ${err.message}`);
    }
};

const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const editId = dom.requestId.value;
    const isEdit = editId !== "";
    const vehicleId = Number(dom.vehicleSelect.value);

    if (!Number.isInteger(vehicleId) || vehicleId < 1) {
        showError("Please select a valid vehicle.");
        return;
    }

    try {
        if (isEdit) {
            await api.update(Number(editId), {
                partName: dom.partName.value,
                partNumber: dom.partNumber.value || null,
                description: dom.description.value || null,
                status: "Pending",
                vehicleId: vehicleId
            });
        } else {
            await api.create({
                partName: dom.partName.value,
                partNumber: dom.partNumber.value || null,
                description: dom.description.value || null,
                customerId: currentCustomerId,
                vehicleId: vehicleId
            });
        }

        hideForm();
        await loadAll();
    } catch (err) {
        showError(`Could not save part request: ${err.message}`);
    }
};

const confirmDelete = (id) => {
    deleteTargetId = id;
    dom.confirmDialog.showModal();
};

const handleConfirmYes = async () => {
    dom.confirmDialog.close();

    if (!deleteTargetId) return;

    try {
        await api.remove(deleteTargetId);
        deleteTargetId = null;
        await loadAll();
    } catch (err) {
        showError(`Could not delete part request: ${err.message}`);
    }
};

const handleTableClick = (event) => {
    const editBtn = event.target.closest(".edit-btn");
    if (editBtn) {
        openEditForm(Number(editBtn.dataset.id));
        return;
    }

    const deleteBtn = event.target.closest(".delete-btn");
    if (deleteBtn) {
        confirmDelete(Number(deleteBtn.dataset.id));
    }
};

const bindEvents = () => {
    dom.loadBtn.addEventListener("click", () => loadByCustomer());

    dom.customerIdInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") loadByCustomer();
    });

    dom.openFormBtn.addEventListener("click", openCreateForm);
    dom.cancelBtn.addEventListener("click", hideForm);
    dom.form.addEventListener("submit", handleSubmit);
    dom.tbody.addEventListener("click", handleTableClick);
    dom.confirmYes.addEventListener("click", handleConfirmYes);
    dom.confirmNo.addEventListener("click", () => dom.confirmDialog.close());
};

const init = () => {
    bindEvents();

    const userId = Number(RBAC.getUserId());
    const role = RBAC.getUserRole();

    if (Number.isInteger(userId) && userId > 0 && role === "Customer") {
        dom.customerIdInput.value = String(userId);
        dom.customerIdInput.readOnly = true;
        dom.customerIdInput.placeholder = "Signed-in customer";
        loadByCustomer(userId);
        return;
    }

    loadAll();
};

init();