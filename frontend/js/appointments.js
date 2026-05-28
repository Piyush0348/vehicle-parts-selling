import RBAC from "./rbac.js";

const CONFIG = Object.freeze({
    APPOINTMENTS_URL: "http://localhost:5033/api/appointments",
    CUSTOMER_APPOINTMENTS: (id) =>
        `http://localhost:5033/api/appointments/customer/${id}`,
    CUSTOMER_DETAIL: (id) =>
        `http://localhost:5033/api/customers/${id}`
});

const dom = Object.freeze({
    openFormBtn:    document.getElementById("open-form-btn"),
    tableSection:   document.getElementById("appointments-table-section"),
    tbody:          document.getElementById("appointments-tbody"),
    noMsg:          document.getElementById("no-appointments-msg"),
    formSection:    document.getElementById("form-section"),
    formHeading:    document.getElementById("form-heading"),
    form:           document.getElementById("appointment-form"),
    appointmentId:  document.getElementById("appointment-id"),
    dateInput:      document.getElementById("appointment-date"),
    serviceType:    document.getElementById("service-type"),
    vehicleSelect:  document.getElementById("vehicle-select"),
    notesInput:     document.getElementById("appointment-notes"),
    submitBtn:      document.getElementById("submit-btn"),
    cancelBtn:      document.getElementById("cancel-btn"),
    confirmDialog:  document.getElementById("confirm-dialog"),
    confirmYes:     document.getElementById("confirm-yes"),
    confirmNo:      document.getElementById("confirm-no"),
    errorMsg:       document.getElementById("error-msg")
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
    const id = RBAC.getUserId();
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? null : parsed;
}

function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    }) + " " + d.toLocaleTimeString("en-GB", {
        hour: "2-digit", minute: "2-digit"
    });
}

function statusClass(status) {
    const s = (status || "").toLowerCase();
    const map = {
        pending:   "status-pending",
        confirmed: "status-confirmed",
        completed: "status-completed",
        cancelled: "status-cancelled"
    };
    return map[s] || "status-pending";
}

function showError(msg) {
    dom.errorMsg.textContent    = msg;
    dom.errorMsg.style.display  = "block";
    setTimeout(() => { dom.errorMsg.style.display = "none"; }, 5000);
}

function clearError() {
    dom.errorMsg.textContent   = "";
    dom.errorMsg.style.display = "none";
}

function populateVehicles(vehicles) {
    let html = '<option value="">Select vehicle</option>';
    vehicles.forEach(v => {
        html += `<option value="${v.id}">
            ${v.vehicleNumber} - ${v.vehicleMake} ${v.vehicleModel}
        </option>`;
    });
    dom.vehicleSelect.innerHTML = html;
}

function appointmentToRow(a) {
    const canEdit = a.status === "Pending" || a.status === "Confirmed";
    return `<tr>
        <td>${a.id}</td>
        <td>${formatDate(a.appointmentDate)}</td>
        <td>${a.serviceType}</td>
        <td>${a.vehicleNumber}</td>
        <td>${a.notes || "—"}</td>
        <td>
            <span class="status-badge ${statusClass(a.status)}">
                ${a.status}
            </span>
        </td>
        <td class="actions">
            ${canEdit
                ? `<button class="edit-btn"   data-id="${a.id}">Edit</button>
                   <button class="delete-btn" data-id="${a.id}">Cancel</button>`
                : "—"
            }
        </td>
    </tr>`;
}

function renderTable(appointments) {
    if (!appointments || appointments.length === 0) {
        dom.tbody.innerHTML        = "";
        dom.noMsg.style.display    = "block";
        return;
    }
    dom.noMsg.style.display        = "none";
    dom.tbody.innerHTML            = appointments.map(appointmentToRow).join("");
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
        populateVehicles(currentVehicles);
        return fetch(CONFIG.CUSTOMER_APPOINTMENTS(currentCustomerId), {
            headers: getAuthHeaders()
        });
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to load appointments.");
        return res.json();
    })
    .then(appointments => {
        renderTable(appointments);
        dom.tableSection.style.display = "block";
    })
    .catch(err => showError(err.message));
}

function showForm(heading, submitLabel) {
    dom.formHeading.textContent  = heading;
    dom.submitBtn.textContent    = submitLabel;
    dom.formSection.style.display  = "block";
    dom.tableSection.style.display = "none";
}

function hideForm() {
    dom.form.reset();
    dom.appointmentId.value        = "";
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
    showForm("Book Appointment", "Book Appointment");
}

function openEditForm(id) {
    fetch(`${CONFIG.APPOINTMENTS_URL}/${id}`, {
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Appointment not found.");
        return res.json();
    })
    .then(a => {
        dom.appointmentId.value  = a.id;
        const d                  = new Date(a.appointmentDate);
        const offset             = d.getTimezoneOffset() * 60000;
        dom.dateInput.value      = new Date(
            d.getTime() - offset
        ).toISOString().slice(0, 16);
        dom.serviceType.value    = a.serviceType;
        dom.vehicleSelect.value  = String(a.vehicleId);
        dom.notesInput.value     = a.notes || "";
        showForm("Edit Appointment", "Update Appointment");
    })
    .catch(err => showError(err.message));
}

function handleSubmit(e) {
    e.preventDefault();
    clearError();

    const editId    = dom.appointmentId.value;
    const isEdit    = editId !== "";
    const vehicleId = Number(dom.vehicleSelect.value);

    if (!vehicleId || vehicleId < 1) {
        showError("Please select a vehicle.");
        return;
    }

    if (!dom.dateInput.value) {
        showError("Please select a date and time.");
        return;
    }

    const selectedDate = new Date(dom.dateInput.value);
    if (selectedDate <= new Date()) {
        showError("Appointment date must be in the future.");
        return;
    }

    const url    = isEdit
        ? `${CONFIG.APPOINTMENTS_URL}/${editId}`
        : CONFIG.APPOINTMENTS_URL;
    const method = isEdit ? "PUT" : "POST";
    const body   = isEdit
        ? {
            appointmentDate: selectedDate.toISOString(),
            serviceType:     dom.serviceType.value,
            notes:           dom.notesInput.value || null,
            status:          "Pending"
          }
        : {
            appointmentDate: selectedDate.toISOString(),
            serviceType:     dom.serviceType.value,
            notes:           dom.notesInput.value || null,
            customerId:      currentCustomerId,
            vehicleId:       vehicleId
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
            ? "Update Appointment"
            : "Book Appointment";
    });
}

function confirmCancel(id) {
    deleteTargetId = id;
    dom.confirmDialog.showModal();
}

function handleConfirmYes() {
    dom.confirmDialog.close();
    if (!deleteTargetId) return;

    fetch(`${CONFIG.APPOINTMENTS_URL}/${deleteTargetId}`, {
        method:  "DELETE",
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to cancel appointment.");
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
        confirmCancel(Number(deleteBtn.dataset.id));
    }
}

function init() {
    const customerIdInput = document.getElementById("customer-id-input");
    const loadBtn         = document.getElementById("load-btn");
    if (customerIdInput) customerIdInput.closest("header") &&
        customerIdInput.remove();
    if (loadBtn) loadBtn.remove();
    if (customerIdInput) customerIdInput.remove();

    currentCustomerId = getLoggedInCustomerId();

    if (!currentCustomerId) {
        showError("Please log in to view your appointments.");
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