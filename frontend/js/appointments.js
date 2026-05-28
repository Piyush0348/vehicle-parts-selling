import RBAC from "./rbac.js";

const CONFIG = Object.freeze({
    APPOINTMENTS_URL: "http://localhost:5033/api/appointments",
    CUSTOMER_APPOINTMENTS: function(id) { return "http://localhost:5033/api/appointments/customer/" + id; },
    CUSTOMER_DETAIL: function(id) { return "http://localhost:5033/api/customers/" + id; }
});

const dom = Object.freeze({
    customerIdInput: document.getElementById("customer-id-input"),
    loadBtn: document.getElementById("load-btn"),
    openFormBtn: document.getElementById("open-form-btn"),
    tableSection: document.getElementById("appointments-table-section"),
    tbody: document.getElementById("appointments-tbody"),
    noMsg: document.getElementById("no-appointments-msg"),
    formSection: document.getElementById("form-section"),
    formHeading: document.getElementById("form-heading"),
    form: document.getElementById("appointment-form"),
    appointmentId: document.getElementById("appointment-id"),
    dateInput: document.getElementById("appointment-date"),
    serviceType: document.getElementById("service-type"),
    vehicleSelect: document.getElementById("vehicle-select"),
    notesInput: document.getElementById("appointment-notes"),
    submitBtn: document.getElementById("submit-btn"),
    cancelBtn: document.getElementById("cancel-btn"),
    confirmDialog: document.getElementById("confirm-dialog"),
    confirmYes: document.getElementById("confirm-yes"),
    confirmNo: document.getElementById("confirm-no"),
    errorMsg: document.getElementById("error-msg")
});

var currentCustomerId = null;
var currentVehicles = [];
var deleteTargetId = null;

function getAuthHeaders() {
    var token = RBAC.getToken();
    return token ? { "Authorization": "Bearer " + token } : {};
}

function formatDate(isoString) {
    var d = new Date(isoString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function statusClass(status) {
    var s = (status || "").toLowerCase();
    if (s === "pending") return "status-pending";
    if (s === "confirmed") return "status-confirmed";
    if (s === "completed") return "status-completed";
    if (s === "cancelled") return "status-cancelled";
    return "status-pending";
}

function showError(msg) {
    dom.errorMsg.textContent = msg;
    dom.errorMsg.style.display = "block";
}

function clearError() {
    dom.errorMsg.textContent = "";
    dom.errorMsg.style.display = "none";
}

function getCustomerId() {
    var raw = dom.customerIdInput.value.trim();
    if (!raw || isNaN(Number(raw)) || Number(raw) < 1) return null;
    return parseInt(raw, 10);
}

function appointmentToRow(a) {
    var notes = a.notes ? a.notes : "-";
    var html = "<tr>";
    html += "<td>" + a.id + "</td>";
    html += "<td>" + formatDate(a.appointmentDate) + "</td>";
    html += "<td>" + a.serviceType + "</td>";
    html += "<td>" + a.vehicleNumber + "</td>";
    html += "<td>" + notes + "</td>";
    html += '<td><span class="status-badge ' + statusClass(a.status) + '">' + a.status + '</span></td>';
    html += '<td class="actions">';
    html += '<button class="edit-btn" data-id="' + a.id + '">Edit</button>';
    html += '<button class="delete-btn" data-id="' + a.id + '">Cancel</button>';
    html += '</td>';
    html += "</tr>";
    return html;
}

function renderTable(appointments) {
    if (!appointments || appointments.length === 0) {
        dom.tbody.innerHTML = "";
        dom.noMsg.style.display = "block";
        return;
    }
    dom.noMsg.style.display = "none";
    var html = "";
    for (var i = 0; i < appointments.length; i++) {
        html += appointmentToRow(appointments[i]);
    }
    dom.tbody.innerHTML = html;
}

function populateVehicles(vehicles) {
    var html = '<option value="">Select vehicle</option>';
    for (var i = 0; i < vehicles.length; i++) {
        var v = vehicles[i];
        html += '<option value="' + v.id + '">' + v.vehicleNumber + ' - ' + v.vehicleMake + ' ' + v.vehicleModel + '</option>';
    }
    dom.vehicleSelect.innerHTML = html;
}

function loadAll() {
    clearError();
    fetch(CONFIG.APPOINTMENTS_URL, { headers: getAuthHeaders() })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            renderTable(data);
            dom.tableSection.style.display = "block";
        })
        .catch(function(err) {
            showError("Could not load appointments: " + err.message);
        });
}

function loadByCustomer() {
    clearError();
    var customerId = getCustomerId();
    if (!customerId) {
        showError("Please enter a valid Customer ID.");
        return;
    }

    dom.loadBtn.disabled = true;
    dom.loadBtn.textContent = "Loading...";

    fetch(CONFIG.CUSTOMER_DETAIL(customerId), { headers: getAuthHeaders() })
        .then(function(res) { return res.json(); })
        .then(function(customer) {
            currentCustomerId = customerId;
            currentVehicles = customer.vehicles || [];
            populateVehicles(currentVehicles);
            return fetch(CONFIG.CUSTOMER_APPOINTMENTS(customerId), { headers: getAuthHeaders() });
        })
        .then(function(res) { return res.json(); })
        .then(function(appointments) {
            renderTable(appointments);
            dom.tableSection.style.display = "block";
        })
        .catch(function(err) {
            showError("Could not load appointments: " + err.message);
        })
        .finally(function() {
            dom.loadBtn.disabled = false;
            dom.loadBtn.textContent = "Load";
        });
}

function showForm(heading, submitLabel) {
    dom.formHeading.textContent = heading;
    dom.submitBtn.textContent = submitLabel;
    dom.formSection.style.display = "block";
    dom.tableSection.style.display = "none";
}

function hideForm() {
    dom.form.reset();
    dom.appointmentId.value = "";
    dom.formSection.style.display = "none";
    dom.tableSection.style.display = "block";
}

function openCreateForm() {
    if (!currentCustomerId) {
        showError("Please enter a Customer ID and click Load first.");
        return;
    }
    if (currentVehicles.length === 0) {
        showError("This customer has no vehicles registered.");
        return;
    }
    hideForm();
    showForm("Book Appointment", "Book Appointment");
}

function openEditForm(id) {
    fetch(CONFIG.APPOINTMENTS_URL + "/" + id, { headers: getAuthHeaders() })
        .then(function(res) { return res.json(); })
        .then(function(appointment) {
            if (currentCustomerId !== appointment.customerId || currentVehicles.length === 0) {
                return fetch(CONFIG.CUSTOMER_DETAIL(appointment.customerId), { headers: getAuthHeaders() })
                    .then(function(res) { return res.json(); })
                    .then(function(customer) {
                        currentCustomerId = appointment.customerId;
                        currentVehicles = customer.vehicles || [];
                        populateVehicles(currentVehicles);
                        return appointment;
                    });
            }
            return appointment;
        })
        .then(function(appointment) {
            dom.appointmentId.value = appointment.id;
            var dateLocal = new Date(appointment.appointmentDate);
            var offset = dateLocal.getTimezoneOffset() * 60000;
            var localIso = new Date(dateLocal.getTime() - offset).toISOString().slice(0, 16);
            dom.dateInput.value = localIso;
            dom.serviceType.value = appointment.serviceType;
            dom.vehicleSelect.value = String(appointment.vehicleId);
            dom.notesInput.value = appointment.notes || "";
            showForm("Edit Appointment", "Update Appointment");
        })
        .catch(function(err) {
            showError("Could not load appointment: " + err.message);
        });
}

function handleSubmit(e) {
    e.preventDefault();
    clearError();

    var editId = dom.appointmentId.value;
    var isEdit = editId !== "";
    var vehicleId = Number(dom.vehicleSelect.value);

    if (!vehicleId || vehicleId < 1) {
        showError("Please select a valid vehicle.");
        return;
    }

    var url;
    var method;
    var body;

    if (isEdit) {
        url = CONFIG.APPOINTMENTS_URL + "/" + editId;
        method = "PUT";
        body = {
            appointmentDate: new Date(dom.dateInput.value).toISOString(),
            serviceType: dom.serviceType.value,
            notes: dom.notesInput.value || null,
            status: "Pending"
        };
    } else {
        url = CONFIG.APPOINTMENTS_URL;
        method = "POST";
        body = {
            appointmentDate: new Date(dom.dateInput.value).toISOString(),
            serviceType: dom.serviceType.value,
            notes: dom.notesInput.value || null,
            customerId: currentCustomerId,
            vehicleId: vehicleId
        };
    }

    fetch(url, {
        method: method,
        headers: Object.assign({ "Content-Type": "application/json" }, getAuthHeaders()),
        body: JSON.stringify(body)
    })
    .then(function() {
        hideForm();
        loadAll();
    })
    .catch(function(err) {
        showError("Could not save appointment: " + err.message);
    });
}

function confirmDeleteAppointment(id) {
    deleteTargetId = id;
    dom.confirmDialog.showModal();
}

function handleConfirmYes() {
    dom.confirmDialog.close();
    if (!deleteTargetId) return;

    fetch(CONFIG.APPOINTMENTS_URL + "/" + deleteTargetId, { method: "DELETE", headers: getAuthHeaders() })
        .then(function() {
            deleteTargetId = null;
            loadAll();
        })
        .catch(function(err) {
            showError("Could not cancel appointment: " + err.message);
        });
}

function initCustomerContext() {
    var userId = Number(RBAC.getUserId());
    var role = RBAC.getUserRole();

    if (Number.isInteger(userId) && userId > 0 && role === "Customer") {
        dom.customerIdInput.value = String(userId);
        dom.customerIdInput.readOnly = true;
        dom.customerIdInput.placeholder = "Signed-in customer";
        loadByCustomer();
        return;
    }

    loadAll();
}

function handleTableClick(event) {
    var editBtn = event.target.closest(".edit-btn");
    if (editBtn) {
        openEditForm(Number(editBtn.dataset.id));
        return;
    }
    var deleteBtn = event.target.closest(".delete-btn");
    if (deleteBtn) {
        confirmDeleteAppointment(Number(deleteBtn.dataset.id));
    }
}

dom.loadBtn.addEventListener("click", loadByCustomer);
dom.customerIdInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") loadByCustomer();
});
dom.openFormBtn.addEventListener("click", openCreateForm);
dom.cancelBtn.addEventListener("click", hideForm);
dom.form.addEventListener("submit", handleSubmit);
dom.tbody.addEventListener("click", handleTableClick);
dom.confirmYes.addEventListener("click", handleConfirmYes);
dom.confirmNo.addEventListener("click", function() { dom.confirmDialog.close(); });

initCustomerContext();