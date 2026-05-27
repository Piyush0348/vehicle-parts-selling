if (!localStorage.getItem("token")) {
    window.location.href = "../html/login.html";
}

const CONFIG = Object.freeze({
    VENDORS_URL: "http://localhost:5033/api/suppliers",
    PAGE_SIZE: 15
});

const dom = Object.freeze({
    tbody: document.getElementById("vendors-tbody"),
    emptyState: document.getElementById("empty-state"),
    resultsCount: document.getElementById("results-count"),
    paginationInfo: document.getElementById("pagination-info"),
    paginationControls: document.getElementById("pagination-controls"),
    vendorModal: document.getElementById("vendor-modal"),
    modalTitle: document.getElementById("modal-title"),
    form: document.getElementById("vendor-form"),
    vendorId: document.getElementById("vendor-id"),
    vendorName: document.getElementById("vendor-name"),
    vendorContact: document.getElementById("vendor-contact"),
    vendorEmail: document.getElementById("vendor-email"),
    vendorPhone: document.getElementById("vendor-phone"),
    openFormBtn: document.getElementById("open-form-btn"),
    cancelBtn: document.getElementById("cancel-btn"),
    submitBtn: document.getElementById("submit-btn"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
    searchInput: document.getElementById("search-input"),
    confirmOverlay: document.getElementById("confirm-overlay"),
    confirmYes: document.getElementById("confirm-yes"),
    confirmNo: document.getElementById("confirm-no"),
    toast: document.getElementById("toast")
});

let currentVendors = [];
let filteredVendors = [];
let currentPage = 1;
let deleteTargetId = null;

const showToast = (message, type = "success") => {
    dom.toast.textContent = message;
    dom.toast.className = `toast ${type}`;
    setTimeout(() => dom.toast.classList.add("hidden"), 3000);
};

const createFetcher = (method) => async (url, body = null) => {
    const token = localStorage.getItem("token");
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        }
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

const fetchGet = createFetcher("GET");
const fetchPost = createFetcher("POST");
const fetchPut = createFetcher("PUT");
const fetchDelete = createFetcher("DELETE");

const api = Object.freeze({
    getAllVendors: () => fetchGet(CONFIG.VENDORS_URL),
    getVendorById: (id) => fetchGet(`${CONFIG.VENDORS_URL}/${id}`),
    createVendor: (data) => fetchPost(CONFIG.VENDORS_URL, data),
    updateVendor: (id, data) => fetchPut(`${CONFIG.VENDORS_URL}/${id}`, data),
    deleteVendor: (id) => fetchDelete(`${CONFIG.VENDORS_URL}/${id}`)
});

const renderPagination = () => {
    const totalPages = Math.ceil(filteredVendors.length / CONFIG.PAGE_SIZE);
    const start = (currentPage - 1) * CONFIG.PAGE_SIZE + 1;
    const end = Math.min(currentPage * CONFIG.PAGE_SIZE, filteredVendors.length);

    dom.paginationInfo.textContent = filteredVendors.length === 0
        ? "No vendors found"
        : `Showing ${start} to ${end} of ${filteredVendors.length} vendors`;

    dom.paginationControls.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.textContent = "← Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => { currentPage--; renderTable(); });
    dom.paginationControls.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = `page-btn ${i === currentPage ? "active" : ""}`;
        btn.textContent = i;
        btn.addEventListener("click", () => { currentPage = i; renderTable(); });
        dom.paginationControls.appendChild(btn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.textContent = "Next →";
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.addEventListener("click", () => { currentPage++; renderTable(); });
    dom.paginationControls.appendChild(nextBtn);
};

const renderTable = () => {
    const start = (currentPage - 1) * CONFIG.PAGE_SIZE;
    const paginated = filteredVendors.slice(start, start + CONFIG.PAGE_SIZE);

    dom.resultsCount.textContent = `${filteredVendors.length} vendors`;

    if (filteredVendors.length === 0) {
        dom.tbody.innerHTML = "";
        dom.emptyState.classList.remove("hidden");
    } else {
        dom.emptyState.classList.add("hidden");
        dom.tbody.innerHTML = paginated.map(v => `
            <tr>
                <td>${v.id}</td>
                <td>${v.name}</td>
                <td>${v.contactPerson || "—"}</td>
                <td>${v.email}</td>
                <td>${v.phone || "—"}</td>
                <td>
                    <div class="actions-cell">
                        <button class="tbl-btn tbl-btn-edit" data-id="${v.id}">Edit</button>
                        <button class="tbl-btn tbl-btn-delete" data-id="${v.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    renderPagination();
};

const openModal = () => dom.vendorModal.classList.remove("hidden");
const closeModal = () => {
    dom.vendorModal.classList.add("hidden");
    dom.form.reset();
    dom.vendorId.value = "";
    dom.modalTitle.textContent = "Add New Vendor";
};

const showConfirm = (id) => {
    deleteTargetId = id;
    dom.confirmOverlay.classList.remove("hidden");
};

const hideConfirm = () => {
    deleteTargetId = null;
    dom.confirmOverlay.classList.add("hidden");
};

const loadVendors = async () => {
    try {
        currentVendors = await api.getAllVendors();
        filteredVendors = [...currentVendors];
        renderTable();
    } catch {
        showToast("Failed to load vendors", "error");
    }
};

const handleFormSubmit = async () => {
    const data = {
        name: dom.vendorName.value.trim(),
        contactPerson: dom.vendorContact.value.trim(),
        email: dom.vendorEmail.value.trim(),
        phone: dom.vendorPhone.value.trim()
    };

    const editId = dom.vendorId.value;

    try {
        if (editId) {
            await api.updateVendor(parseInt(editId, 10), { ...data, id: parseInt(editId, 10) });
            showToast("Vendor updated successfully");
        } else {
            await api.createVendor(data);
            showToast("Vendor created successfully");
        }
        closeModal();
        await loadVendors();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
};

const handleEditClick = async (id) => {
    try {
        const vendor = await api.getVendorById(id);
        dom.vendorId.value = vendor.id;
        dom.vendorName.value = vendor.name;
        dom.vendorContact.value = vendor.contactPerson || "";
        dom.vendorEmail.value = vendor.email;
        dom.vendorPhone.value = vendor.phone || "";
        dom.modalTitle.textContent = "Edit Vendor";
        openModal();
    } catch {
        showToast("Error loading vendor", "error");
    }
};

const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;
    try {
        await api.deleteVendor(deleteTargetId);
        showToast("Vendor deleted successfully");
        hideConfirm();
        await loadVendors();
    } catch {
        showToast("Error deleting vendor", "error");
        hideConfirm();
    }
};

const handleSearch = () => {
    const term = dom.searchInput.value.toLowerCase().trim();
    filteredVendors = term === ""
        ? [...currentVendors]
        : currentVendors.filter(v =>
            v.name.toLowerCase().includes(term) ||
            v.email.toLowerCase().includes(term)
        );
    currentPage = 1;
    renderTable();
};

const handleTableClick = (event) => {
    const target = event.target;
    if (!target.dataset.id) return;
    const id = parseInt(target.dataset.id, 10);
    if (target.classList.contains("tbl-btn-edit")) handleEditClick(id);
    if (target.classList.contains("tbl-btn-delete")) showConfirm(id);
};

const logout = () => {
    localStorage.clear();
    window.location.href = "login.html";
};

window.logout = logout;

const bindEvents = () => {
    dom.openFormBtn.addEventListener("click", () => {
        dom.modalTitle.textContent = "Add New Vendor";
        openModal();
    });
    dom.cancelBtn.addEventListener("click", closeModal);
    dom.modalCloseBtn.addEventListener("click", closeModal);
    dom.submitBtn.addEventListener("click", handleFormSubmit);
    dom.tbody.addEventListener("click", handleTableClick);
    dom.searchInput.addEventListener("input", handleSearch);
    dom.confirmYes.addEventListener("click", handleDeleteConfirm);
    dom.confirmNo.addEventListener("click", hideConfirm);
};

const init = async () => {
    bindEvents();
    await loadVendors();
};

init();