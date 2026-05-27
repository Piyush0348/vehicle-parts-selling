if (!localStorage.getItem("token")) {
    window.location.href = "../html/login.html";
}

const API_BASE = "http://localhost:5033/api/customers";
const PAGE_SIZE = 15;

const dom = {
    tbody: document.getElementById("staff-tbody"),
    emptyState: document.getElementById("empty-state"),
    resultsCount: document.getElementById("results-count"),
    paginationInfo: document.getElementById("pagination-info"),
    paginationControls: document.getElementById("pagination-controls"),
    staffModal: document.getElementById("staff-modal"),
    form: document.getElementById("staff-form"),
    openFormBtn: document.getElementById("open-form-btn"),
    cancelBtn: document.getElementById("cancel-btn"),
    submitBtn: document.getElementById("submit-btn"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
    confirmOverlay: document.getElementById("confirm-overlay"),
    confirmYes: document.getElementById("confirm-yes"),
    confirmNo: document.getElementById("confirm-no"),
    firstName: document.getElementById("first-name"),
    lastName: document.getElementById("last-name"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    password: document.getElementById("password"),
    toast: document.getElementById("toast")
};

let allStaff = [];
let currentPage = 1;
let deleteTargetId = null;

const showToast = (message, type = "success") => {
    dom.toast.textContent = message;
    dom.toast.className = `toast ${type}`;
    setTimeout(() => dom.toast.classList.add("hidden"), 3000);
};

const fetcher = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const res = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        ...options
    });
    if (!res.ok) throw new Error("Request failed");
    if (res.status === 204) return null;
    return res.json();
};

const getRoleBadge = (role) => {
    const cls = role === "Admin" ? "role-admin" : "role-staff";
    return `<span class="role-badge ${cls}">${role}</span>`;
};

const renderPagination = () => {
    const totalPages = Math.ceil(allStaff.length / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, allStaff.length);

    dom.paginationInfo.textContent = allStaff.length === 0
        ? "No staff found"
        : `Showing ${start} to ${end} of ${allStaff.length} staff`;

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
    const start = (currentPage - 1) * PAGE_SIZE;
    const paginated = allStaff.slice(start, start + PAGE_SIZE);

    dom.resultsCount.textContent = `${allStaff.length} staff`;

    if (allStaff.length === 0) {
        dom.tbody.innerHTML = "";
        dom.emptyState.classList.remove("hidden");
    } else {
        dom.emptyState.classList.add("hidden");
        dom.tbody.innerHTML = paginated.map(s => `
            <tr>
                <td>${s.id}</td>
                <td>${s.firstName}</td>
                <td>${s.lastName}</td>
                <td>${s.email}</td>
                <td>${s.phone ?? "—"}</td>
                <td>${getRoleBadge(s.role ?? "Staff")}</td>
                <td>
                    <div class="actions-cell">
                        <button class="tbl-btn tbl-btn-toggle" data-id="${s.id}" data-role="${s.role}">Toggle Role</button>
                        <button class="tbl-btn tbl-btn-delete" data-id="${s.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    renderPagination();
};

const openModal = () => dom.staffModal.classList.remove("hidden");
const closeModal = () => {
    dom.staffModal.classList.add("hidden");
    dom.form.reset();
};

const showConfirm = (id) => {
    deleteTargetId = id;
    dom.confirmOverlay.classList.remove("hidden");
};

const hideConfirm = () => {
    deleteTargetId = null;
    dom.confirmOverlay.classList.add("hidden");
};

const loadStaff = async () => {
    try {
        allStaff = await fetcher(`${API_BASE}/staff`);
        renderTable();
    } catch (e) {
        showToast("Failed to load staff", "error");
    }
};

const handleCreate = async () => {
    const data = {
        firstName: dom.firstName.value.trim(),
        lastName: dom.lastName.value.trim(),
        email: dom.email.value.trim(),
        phone: dom.phone.value.trim(),
        password: dom.password.value
    };

    try {
        await fetcher(`${API_BASE}/staff`, {
            method: "POST",
            body: JSON.stringify(data)
        });
        showToast("Staff member created successfully");
        closeModal();
        await loadStaff();
    } catch {
        showToast("Error creating staff member", "error");
    }
};

const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
        await fetcher(`${API_BASE}/staff/${deleteTargetId}`, { method: "DELETE" });
        showToast("Staff member deleted");
        hideConfirm();
        await loadStaff();
    } catch {
        showToast("Delete failed", "error");
        hideConfirm();
    }
};

const handleToggleRole = async (id, currentRole) => {
    const newRole = currentRole === "Admin" ? "Staff" : "Admin";
    try {
        await fetcher(`${API_BASE}/staff/${id}?role=${newRole}`, { method: "PUT" });
        showToast(`Role changed to ${newRole}`);
        await loadStaff();
    } catch {
        showToast("Failed to update role", "error");
    }
};

const handleTableClick = (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains("tbl-btn-delete")) showConfirm(id);
    if (e.target.classList.contains("tbl-btn-toggle")) {
        handleToggleRole(id, e.target.dataset.role);
    }
};

const logout = () => {
    localStorage.clear();
    window.location.href = "login.html";
};

window.logout = logout;

dom.openFormBtn.addEventListener("click", openModal);
dom.cancelBtn.addEventListener("click", closeModal);
dom.modalCloseBtn.addEventListener("click", closeModal);
dom.submitBtn.addEventListener("click", handleCreate);
dom.tbody.addEventListener("click", handleTableClick);
dom.confirmYes.addEventListener("click", handleDelete);
dom.confirmNo.addEventListener("click", hideConfirm);

loadStaff();