import RBAC from "./rbac.js";

const CONFIG = Object.freeze({
    REQUESTS_URL:      "http://localhost:5033/api/part-requests",
    CUSTOMER_REQUESTS: (id) =>
        `http://localhost:5033/api/part-requests/customer/${id}`,
    CUSTOMER_DETAIL:   (id) =>
        `http://localhost:5033/api/customers/${id}`
});

const dom = Object.freeze({
    openFormBtn:  document.getElementById("open-form-btn"),
    tableSection: document.getElementById("requests-table-section"),
    tbody:        document.getElementById("requests-tbody"),
    noMsg:        document.getElementById("no-requests-msg"),
    formSection:  document.getElementById("form-section"),
    formHeading:  document.getElementById("form-heading"),
    form:         document.getElementById("request-form"),
    requestId:    document.getElementById("request-id"),
    partName:     document.getElementById("part-name"),
    partNumber:   document.getElementById("part-number"),
    vehicleSelect:document.getElementById("vehicle-select"),
    description:  document.getElementById("part-description"),
    submitBtn:    document.getElementById("submit-btn"),
    cancelBtn:    document.getElementById("cancel-btn"),
    confirmDialog:document.getElementById("confirm-dialog"),
    confirmYes:   document.getElementById("confirm-yes"),
    confirmNo:    document.getElementById("confirm-no"),
    errorMsg:     document.getElementById("error-msg")
});

let currentCustomerId = null;
let currentVehicles   = [];
let deleteTargetId    = null;

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

function formatDate(isoString) {
    return new Date(isoString).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function statusClass(status) {
    const map = {
        pending:   "status-pending",
        approved:  "status-approved",
        fulfilled: "status-fulfilled",
        rejected:  "status-rejected"
    };
    return map[(status || "").toLowerCase()] || "status-pending";
}

function showError(msg) {
    dom.errorMsg.textContent   = msg;
    dom.errorMsg.style.display = "block";
    setTimeout(() => { dom.errorMsg.style.display = "none"; }, 5000);
}

function clearError() {
    dom.errorMsg.textContent   = "";
    dom.errorMsg.style.display = "none";
}

function populateVehicleSelect(vehicles) {
    let html = '<option value="">Select vehicle</option>';
    vehicles.forEach(v => {
        html += `<option value="${v.id}">
            ${v.vehicleNumber} - ${v.vehicleMake} ${v.vehicleModel}
        </option>`;
    });
    dom.vehicleSelect.innerHTML = html;
}

function requestToRow(r) {
    const canEdit = r.status === "Pending";
    return `<tr>
        <td>${r.id}</td>
        <td>${r.partName}</td>
        <td>${r.partNumber || "—"}</td>
        <td>${r.vehicleNumber}</td>
        <td>${r.description || "—"}</td>
        <td>
            <span class="status-badge ${statusClass(r.status)}">
                ${r.status}
            </span>
        </td>
        <td>${formatDate(r.createdAt)}</td>
        <td class="actions">
            ${canEdit
                ? `<button class="edit-btn"   data-id="${r.id}">Edit</button>
                   <button class="delete-btn" data-id="${r.id}">Delete</button>`
                : "—"
            }
        </td>
    </tr>`;
}

function renderTable(requests) {
    if (!requests || requests.length === 0) {
        dom.tbody.innerHTML     = "";
        dom.noMsg.style.display = "block";
        return;
    }
    dom.noMsg.style.display = "none";
    dom.tbody.innerHTML     = requests.map(requestToRow).join("");
}

function loadData() {
    clearError();

    fetch(CONFIG.CUSTOMER_DETAIL(currentCustomerId), {
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to load your account data.");
        return res.json();
    })
    .then(customer => {
        currentVehicles = customer.vehicles || [];
        populateVehicleSelect(currentVehicles);
        return fetch(CONFIG.CUSTOMER_REQUESTS(currentCustomerId), {
            headers: getAuthHeaders()
        });
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to load part requests.");
        return res.json();
    })
    .then(requests => {
        renderTable(requests);
        dom.tableSection.style.display = "block";
    })
    .catch(err => showError(err.message));
}

function showForm(heading, submitLabel) {
    dom.formHeading.textContent    = heading;
    dom.submitBtn.textContent      = submitLabel;
    dom.formSection.style.display  = "block";
    dom.tableSection.style.display = "none";
}

function hideForm() {
    dom.form.reset();
    dom.requestId.value            = "";
    dom.formSection.style.display  = "none";
    dom.tableSection.style.display = "block";
}

function openCreateForm() {
    if (currentVehicles.length === 0) {
        showError(
            "You have no vehicles registered. " +
            "Please add a vehicle from your profile first."
        );
        return;
    }
    hideForm();
    showForm("Request Unavailable Part", "Submit Request");
}

function openEditForm(id) {
    fetch(`${CONFIG.REQUESTS_URL}/${id}`, {
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Request not found.");
        return res.json();
    })
    .then(r => {
        dom.requestId.value     = r.id;
        dom.partName.value      = r.partName;
        dom.partNumber.value    = r.partNumber || "";
        dom.description.value   = r.description || "";
        dom.vehicleSelect.value = String(r.vehicleId);
        showForm("Edit Part Request", "Update Request");
    })
    .catch(err => showError(err.message));
}

function handleSubmit(e) {
    e.preventDefault();
    clearError();

    const editId    = dom.requestId.value;
    const isEdit    = editId !== "";
    const vehicleId = Number(dom.vehicleSelect.value);

    if (!vehicleId || vehicleId < 1) {
        showError("Please select a vehicle.");
        return;
    }

    if (!dom.partName.value.trim()) {
        showError("Please enter the part name.");
        return;
    }

    const url    = isEdit
        ? `${CONFIG.REQUESTS_URL}/${editId}`
        : CONFIG.REQUESTS_URL;
    const method = isEdit ? "PUT" : "POST";
    const body   = isEdit
        ? {
            partName:    dom.partName.value.trim(),
            partNumber:  dom.partNumber.value.trim() || null,
            description: dom.description.value.trim() || null,
            status:      "Pending",
            vehicleId:   vehicleId
          }
        : {
            partName:    dom.partName.value.trim(),
            partNumber:  dom.partNumber.value.trim() || null,
            description: dom.description.value.trim() || null,
            customerId:  currentCustomerId,
            vehicleId:   vehicleId
          };

    dom.submitBtn.disabled    = true;
    dom.submitBtn.textContent = "Saving…";

    fetch(url, {
        method,
        headers: getAuthHeaders(),
        body:    JSON.stringify(body)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(err.message || "Failed to save.");
            });
        }
        hideForm();
        loadData();
    })
    .catch(err => showError(err.message))
    .finally(() => {
        dom.submitBtn.disabled    = false;
        dom.submitBtn.textContent = isEdit
            ? "Update Request"
            : "Submit Request";
    });
}

function confirmDelete(id) {
    deleteTargetId = id;
    dom.confirmDialog.showModal();
}

function handleConfirmYes() {
    dom.confirmDialog.close();
    if (!deleteTargetId) return;

    fetch(`${CONFIG.REQUESTS_URL}/${deleteTargetId}`, {
        method:  "DELETE",
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to delete request.");
        deleteTargetId = null;
        loadData();
    })
    .catch(err => showError(err.message));
}

function handleTableClick(e) {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
        openEditForm(Number(editBtn.dataset.id));
        return;
    }
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
        confirmDelete(Number(deleteBtn.dataset.id));
    }
}

function init() {
    const customerIdInput = document.getElementById("customer-id-input");
    const loadBtn         = document.getElementById("load-btn");
    if (customerIdInput) customerIdInput.remove();
    if (loadBtn)         loadBtn.remove();

    currentCustomerId = getLoggedInCustomerId();

    if (!currentCustomerId) {
        showError("Please log in to view your part requests.");
        dom.openFormBtn.style.display = "none";
        return;
    }

    dom.openFormBtn.addEventListener("click",  openCreateForm);
    dom.cancelBtn.addEventListener("click",    hideForm);
    dom.form.addEventListener("submit",        handleSubmit);
    dom.tbody.addEventListener("click",        handleTableClick);
    dom.confirmYes.addEventListener("click",   handleConfirmYes);
    dom.confirmNo.addEventListener("click",    () => dom.confirmDialog.close());

    loadData();
}

init();