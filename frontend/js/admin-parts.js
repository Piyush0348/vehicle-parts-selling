if (!localStorage.getItem("token")) {
    window.location.href = "../html/login.html";
}

const CONFIG = Object.freeze({
    API_BASE: "http://localhost:5033/api",
    PRODUCTS_URL: "http://localhost:5033/api/products",
    CATEGORIES_URL: "http://localhost:5033/api/categories",
    SUPPLIERS_URL: "http://localhost:5033/api/suppliers",
    LOW_STOCK_THRESHOLD: 10,
    PAGE_SIZE: 15
});

const dom = Object.freeze({
    tbody: document.getElementById("parts-tbody"),
    emptyState: document.getElementById("empty-state"),
    resultsCount: document.getElementById("results-count"),
    paginationInfo: document.getElementById("pagination-info"),
    paginationControls: document.getElementById("pagination-controls"),
    partModal: document.getElementById("part-modal"),
    modalTitle: document.getElementById("modal-title"),
    form: document.getElementById("part-form"),
    partId: document.getElementById("part-id"),
    partName: document.getElementById("part-name"),
    partSku: document.getElementById("part-sku"),
    partPrice: document.getElementById("part-price"),
    partStock: document.getElementById("part-stock"),
    partCategory: document.getElementById("part-category"),
    partSupplier: document.getElementById("part-supplier"),
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

let currentProducts = [];
let filteredProducts = [];
let currentPage = 1;
let deleteTargetId = null;

const formatPrice = (price) => `Rs. ${Number(price).toFixed(2)}`;

const getStockClass = (qty) =>
    qty < CONFIG.LOW_STOCK_THRESHOLD ? "stock-low" : "stock-ok";

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
    getAllProducts: () => fetchGet(CONFIG.PRODUCTS_URL),
    getProductById: (id) => fetchGet(`${CONFIG.PRODUCTS_URL}/${id}`),
    createProduct: (data) => fetchPost(CONFIG.PRODUCTS_URL, data),
    updateProduct: (id, data) => fetchPut(`${CONFIG.PRODUCTS_URL}/${id}`, data),
    deleteProduct: (id) => fetchDelete(`${CONFIG.PRODUCTS_URL}/${id}`),
    getAllCategories: () => fetchGet(CONFIG.CATEGORIES_URL),
    getAllSuppliers: () => fetchGet(CONFIG.SUPPLIERS_URL)
});

const renderPagination = () => {
    const totalPages = Math.ceil(filteredProducts.length / CONFIG.PAGE_SIZE);
    const start = (currentPage - 1) * CONFIG.PAGE_SIZE + 1;
    const end = Math.min(currentPage * CONFIG.PAGE_SIZE, filteredProducts.length);

    dom.paginationInfo.textContent = filteredProducts.length === 0
        ? "Showing 0 results"
        : `Showing ${start} to ${end} of ${filteredProducts.length} parts`;

    dom.paginationControls.innerHTML = "";

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-btn";
    prevBtn.textContent = "← Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener("click", () => {
        currentPage--;
        renderTable();
    });
    dom.paginationControls.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = `page-btn ${i === currentPage ? "active" : ""}`;
        btn.textContent = i;
        btn.addEventListener("click", () => {
            currentPage = i;
            renderTable();
        });
        dom.paginationControls.appendChild(btn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-btn";
    nextBtn.textContent = "Next →";
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.addEventListener("click", () => {
        currentPage++;
        renderTable();
    });
    dom.paginationControls.appendChild(nextBtn);
};

const renderTable = () => {
    const start = (currentPage - 1) * CONFIG.PAGE_SIZE;
    const paginated = filteredProducts.slice(start, start + CONFIG.PAGE_SIZE);

    dom.resultsCount.textContent = `${filteredProducts.length} parts`;

    if (filteredProducts.length === 0) {
        dom.tbody.innerHTML = "";
        dom.emptyState.classList.remove("hidden");
    } else {
        dom.emptyState.classList.add("hidden");
        dom.tbody.innerHTML = paginated.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.name}</td>
                <td>${p.sku}</td>
                <td>${p.categoryName}</td>
                <td>${p.supplierName}</td>
                <td>${formatPrice(p.price)}</td>
                <td><span class="${getStockClass(p.stockQty)}">${p.stockQty}</span></td>
                <td>
                    <div class="actions-cell">
                        <button class="tbl-btn tbl-btn-edit" data-id="${p.id}">Edit</button>
                        <button class="tbl-btn tbl-btn-delete" data-id="${p.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    renderPagination();
};

const openModal = () => dom.partModal.classList.remove("hidden");
const closeModal = () => {
    dom.partModal.classList.add("hidden");
    dom.form.reset();
    dom.partId.value = "";
    dom.modalTitle.textContent = "Add New Part";
};

const showConfirm = (id) => {
    deleteTargetId = id;
    dom.confirmOverlay.classList.remove("hidden");
};

const hideConfirm = () => {
    deleteTargetId = null;
    dom.confirmOverlay.classList.add("hidden");
};

const loadProducts = async () => {
    try {
        currentProducts = await api.getAllProducts();
        filteredProducts = [...currentProducts];
        renderTable();
    } catch (err) {
        showToast("Failed to load parts", "error");
    }
};

const loadDropdowns = async () => {
    try {
        const [categories, suppliers] = await Promise.all([
            api.getAllCategories(),
            api.getAllSuppliers()
        ]);

        dom.partCategory.innerHTML = '<option value="">Select category</option>' +
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

        dom.partSupplier.innerHTML = '<option value="">Select supplier</option>' +
            suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    } catch (err) {
        showToast("Failed to load dropdowns", "error");
    }
};

const handleFormSubmit = async () => {
    const data = {
        name: dom.partName.value.trim(),
        sku: dom.partSku.value.trim(),
        price: parseFloat(dom.partPrice.value),
        stockQty: parseInt(dom.partStock.value, 10),
        categoryId: parseInt(dom.partCategory.value, 10),
        supplierId: parseInt(dom.partSupplier.value, 10)
    };

    const editId = dom.partId.value;

    try {
        if (editId) {
            await api.updateProduct(parseInt(editId, 10), data);
            showToast("Part updated successfully");
        } else {
            await api.createProduct(data);
            showToast("Part created successfully");
        }
        closeModal();
        await loadProducts();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
};

const handleEditClick = async (id) => {
    try {
        const product = await api.getProductById(id);
        dom.partId.value = product.id;
        dom.partName.value = product.name;
        dom.partSku.value = product.sku;
        dom.partPrice.value = product.price;
        dom.partStock.value = product.stockQty;
        dom.partCategory.value = product.categoryId;
        dom.partSupplier.value = product.supplierId;
        dom.modalTitle.textContent = "Edit Part";
        openModal();
    } catch (err) {
        showToast("Error loading part", "error");
    }
};

const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;
    try {
        await api.deleteProduct(deleteTargetId);
        showToast("Part deleted successfully");
        hideConfirm();
        await loadProducts();
    } catch (err) {
        showToast("Error deleting part", "error");
        hideConfirm();
    }
};

const handleSearch = () => {
    const term = dom.searchInput.value.toLowerCase().trim();
    filteredProducts = term === ""
        ? [...currentProducts]
        : currentProducts.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.sku.toLowerCase().includes(term)
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
        dom.modalTitle.textContent = "Add New Part";
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
    await Promise.all([loadProducts(), loadDropdowns()]);
};

init();