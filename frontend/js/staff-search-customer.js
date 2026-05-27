// Staff Customer Search & Portal JavaScript
const API_BASE_URL = 'http://localhost:5033/api';

// State Management
let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentCustomerId = null;
let currentOrderId = null;
let modalVehicleCount = 0;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const resultsTable = document.getElementById('resultsTable');
const resultsBody = document.getElementById('resultsBody');
const resultsCount = document.getElementById('resultsCount');
const noResultsState = document.getElementById('noResultsState');
const tableLoader = document.getElementById('tableLoader');

// Pagination elements
const pageStart = document.getElementById('pageStart');
const pageEnd = document.getElementById('pageEnd');
const totalItems = document.getElementById('totalItems');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageNumbersContainer = document.getElementById('pageNumbers');

// Modals elements
const createCustomerModal = document.getElementById('createCustomerModal');
const customerDetailsModal = document.getElementById('customerDetailsModal');
const customerVehicleModal = document.getElementById('customerVehicleModal');
const customerHistoryModal = document.getElementById('customerHistoryModal');
const orderDetailsDialog = document.getElementById('orderDetailsDialog');

// Action elements inside modals
const summaryReportBtn = document.getElementById('summaryReportBtn');
const openRegisterModalBtn = document.getElementById('openRegisterModalBtn');
const addVehicleBtn = document.getElementById('addVehicleBtn');
const vehiclesContainer = document.getElementById('vehiclesContainer');
const customerRegistrationForm = document.getElementById('customerRegistrationForm');
const loadingSpinner = document.getElementById('loadingSpinner');
const alertMessage = document.getElementById('alertMessage');

// Detail / History / Order bindings
const detailsModalContent = document.getElementById('detailsModalContent');
const detailsModalHistoryBtn = document.getElementById('detailsModalHistoryBtn');
const vehicleModalContent = document.getElementById('vehicleModalContent');
const vehicleModalSubtitle = document.getElementById('vehicleModalSubtitle');
const historyModalSubtitle = document.getElementById('historyModalSubtitle');
const historyModalNewSaleBtn = document.getElementById('historyModalNewSaleBtn');

// History stats
const histStatOrders = document.getElementById('histStatOrders');
const histStatSpent = document.getElementById('histStatSpent');
const histStatVehicles = document.getElementById('histStatVehicles');
const histStatAvg = document.getElementById('histStatAvg');
const historyTableBody = document.getElementById('historyTableBody');
const noHistoryMessage = document.getElementById('noHistoryMessage');

// Inline order details
const orderDetailId = document.getElementById('orderDetailId');
const orderItemsTbody = document.getElementById('orderItemsTbody');
const subTotal = document.getElementById('subTotal');
const discountAmount = document.getElementById('discountAmount');
const orderTotal = document.getElementById('orderTotal');
const printInvoiceBtn = document.getElementById('printInvoiceBtn');

// Event Listeners Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || (role !== 'Staff' && role !== 'Admin')) {
        window.location.href = 'login.html';
        return;
    }

    // Initial fetch of all customers
    fetchCustomers();

    // Search events
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim().length > 0) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
            // If they clear input manually, reset search
            resetSearch();
        }
    });
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        resetSearch();
    });

    // Pagination events
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) changePage(currentPage - 1);
    });
    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
        if (currentPage < totalPages) changePage(currentPage + 1);
    });

    // Modal creation events
    summaryReportBtn.addEventListener('click', showSummaryReport);
    openRegisterModalBtn.addEventListener('click', openCreateCustomerModal);
    addVehicleBtn.addEventListener('click', addVehicleFormEntry);
    customerRegistrationForm.addEventListener('submit', handleRegisterSubmit);

    // Modal action redirections
    detailsModalHistoryBtn.addEventListener('click', () => {
        closeModal('customerDetailsModal');
        showCustomerHistory(currentCustomerId);
    });
    historyModalNewSaleBtn.addEventListener('click', () => {
        if (currentCustomerId) {
            window.location.href = `staff-sales.html?customerId=${currentCustomerId}`;
        }
    });
    printInvoiceBtn.addEventListener('click', printSalesInvoice);
});

async function showSummaryReport() {
    toggleSpinner(true);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers/reports/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to generate report');

        const data = await response.json();
        const content = document.getElementById('reportContent');

        content.innerHTML = `
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0b3c5d;">
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: bold;">Total Customers</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: #0b3c5d;">${data.totalCustomers}</div>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: bold;">Regulars (2+ Orders)</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${data.regularCustomers}</div>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: bold;">High Spenders (>10k)</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">${data.highSpenders}</div>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <div style="font-size: 0.8rem; color: #64748b; text-transform: uppercase; font-weight: bold;">Due for Service</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: #ef4444;">${data.pendingFollowups}</div>
            </div>
        `;
        openModal('reportModal');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        toggleSpinner(false);
    }
}

// Helper: Open / Close Modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock background scrolling
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Unlock background scrolling
    }
}

// Global modal closer when clicking overlay
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
    }
});

// Toast Notifications
function showToast(message, type = 'info') {
    alertMessage.textContent = message;
    alertMessage.className = `toast-notification ${type}`;
    alertMessage.classList.remove('hidden');
    
    setTimeout(() => {
        alertMessage.classList.add('hidden');
    }, 4500);
}

// Fetch Customers List
async function fetchCustomers() {
    toggleLoader(true);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Could not retrieve customers list');
        }

        allCustomers = await response.json();
        filteredCustomers = [...allCustomers];
        
        currentPage = 1;
        renderCustomersTable();
        renderPaginationControls();
    } catch (error) {
        console.error('Error fetching customers:', error);
        showToast(`Failed to load directory: ${error.message}`, 'error');
    } finally {
        toggleLoader(false);
    }
}

// Search Customers Action
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        fetchCustomers();
        return;
    }

    toggleLoader(true);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers/search?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Search failed');
        }

        filteredCustomers = await response.json();
        
        currentPage = 1;
        renderCustomersTable();
        renderPaginationControls();
    } catch (error) {
        console.error('Search error:', error);
        showToast(`Error performing search: ${error.message}`, 'error');
    } finally {
        toggleLoader(false);
    }
}

// Reset search and show all
function resetSearch() {
    filteredCustomers = [...allCustomers];
    currentPage = 1;
    renderCustomersTable();
    renderPaginationControls();
}

// Toggle skeletons loader
function toggleLoader(show) {
    if (show) {
        tableLoader.classList.remove('hidden');
        resultsTable.classList.add('hidden');
        noResultsState.classList.add('hidden');
    } else {
        tableLoader.classList.add('hidden');
        resultsTable.classList.remove('hidden');
    }
}

// Render Customers table with client pagination
function renderCustomersTable() {
    resultsBody.innerHTML = '';
    
    const count = filteredCustomers.length;
    resultsCount.textContent = `${count} Customer${count === 1 ? '' : 's'} Found`;
    
    if (count === 0) {
        resultsTable.classList.add('hidden');
        noResultsState.classList.remove('hidden');
        pageStart.textContent = '0';
        pageEnd.textContent = '0';
        totalItems.textContent = '0';
        return;
    }

    noResultsState.classList.add('hidden');
    resultsTable.classList.remove('hidden');

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, count);
    const visibleCustomers = filteredCustomers.slice(startIndex, endIndex);

    pageStart.textContent = count > 0 ? (startIndex + 1).toString() : '0';
    pageEnd.textContent = endIndex.toString();
    totalItems.textContent = count.toString();

    visibleCustomers.forEach(customer => {
        const tr = document.createElement('tr');
        const vehicleCount = customer.vehicles ? customer.vehicles.length : 0;
        
        tr.innerHTML = `
            <td><strong>#${customer.id}</strong></td>
            <td>
                <span style="font-weight: 600; font-size: 1rem; color: #0b3c5d;">
                    ${customer.firstName} ${customer.lastName}
                </span>
            </td>
            <td>
                <div class="contact-info-cell">
                    <span class="contact-email">${customer.email}</span>
                    <span class="contact-phone">${customer.phone || '—'}</span>
                </div>
            </td>
            <td>
                <span class="badge-vehicle ${vehicleCount === 0 ? 'zero' : ''}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                        <circle cx="7" cy="17" r="2"></circle>
                        <path d="M9 17h6"></path>
                        <circle cx="17" cy="17" r="2"></circle>
                    </svg>
                    ${vehicleCount} Vehicle${vehicleCount === 1 ? '' : 's'}
                </span>
            </td>
            <td class="text-right">
                <div class="actions-cell-wrapper">
                    <button class="action-pill-btn btn-tbl-details" onclick="showCustomerDetails(${customer.id})">
                        Details
                    </button>
                    <button class="action-pill-btn btn-tbl-vehicles" onclick="showCustomerVehicles(${customer.id})">
                        Vehicles
                    </button>
                    <button class="action-pill-btn btn-tbl-history" onclick="showCustomerHistory(${customer.id})">
                        History
                    </button>
                    <button class="action-pill-btn btn-tbl-sell" onclick="goToSalesPage(${customer.id})">
                        Sell
                    </button>
                </div>
            </td>
        `;
        resultsBody.appendChild(tr);
    });
}

// Render pagination page buttons
function renderPaginationControls() {
    pageNumbersContainer.innerHTML = '';
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-number-btn ${currentPage === i ? 'active' : ''}`;
        btn.textContent = i;
        btn.addEventListener('click', () => changePage(i));
        pageNumbersContainer.appendChild(btn);
    }
}

function changePage(pageNum) {
    currentPage = pageNum;
    renderCustomersTable();
    renderPaginationControls();
}

// Redirect helper
function goToSalesPage(customerId) {
    window.location.href = `staff-sales.html?customerId=${customerId}`;
}

// 1. CREATE NEW CUSTOMER MODAL MANAGEMENT
function openCreateCustomerModal() {
    customerRegistrationForm.reset();
    vehiclesContainer.innerHTML = '';
    modalVehicleCount = 0;
    
    // Instantiate 1 initial vehicle row automatically
    addVehicleFormEntry();
    
    // Clear validation errors
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('input, select').forEach(el => el.classList.remove('error'));
    
    openModal('createCustomerModal');
}

function addVehicleFormEntry() {
    modalVehicleCount++;
    const id = modalVehicleCount;
    
    const entryHtml = `
        <div class="vehicle-entry-card" id="vehicleEntry_${id}" data-idx="${id}">
            <div class="vehicle-entry-header">
                <span class="vehicle-entry-title">Vehicle Entry #${id}</span>
                <button type="button" class="remove-vehicle-btn" onclick="removeVehicleFormEntry(${id})">
                    Remove
                </button>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label for="vehicleNumber_${id}">License Plate Number *</label>
                    <input type="text" id="vehicleNumber_${id}" placeholder="e.g. BA-2-PA-4321" required>
                    <span class="error-msg"></span>
                </div>
                <div class="form-group">
                    <label for="vehicleMake_${id}">Vehicle Make *</label>
                    <input type="text" id="vehicleMake_${id}" placeholder="e.g. Hyundai" required>
                    <span class="error-msg"></span>
                </div>
                <div class="form-group">
                    <label for="vehicleModel_${id}">Vehicle Model *</label>
                    <input type="text" id="vehicleModel_${id}" placeholder="e.g. Creta" required>
                    <span class="error-msg"></span>
                </div>
                <div class="form-group">
                    <label for="manufacturingYear_${id}">Manufacturing Year *</label>
                    <input type="number" id="manufacturingYear_${id}" min="1950" max="${new Date().getFullYear() + 1}" placeholder="e.g. 2022" required>
                    <span class="error-msg"></span>
                </div>
                <div class="form-group">
                    <label for="vehicleType_${id}">Body Shape/Type</label>
                    <select id="vehicleType_${id}">
                        <option value="">Choose Category (Optional)</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Coupe">Coupe</option>
                        <option value="Truck">Truck</option>
                        <option value="Van">Van</option>
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Other">Other</option>
                    </select>
                    <span class="error-msg"></span>
                </div>
                <div class="form-group">
                    <label for="color_${id}">Color</label>
                    <input type="text" id="color_${id}" placeholder="e.g. Polar White">
                    <span class="error-msg"></span>
                </div>
            </div>
        </div>
    `;
    vehiclesContainer.insertAdjacentHTML('beforeend', entryHtml);
    reIndexVehicles();
}

function removeVehicleFormEntry(id) {
    const cards = document.querySelectorAll('.vehicle-entry-card');
    if (cards.length <= 1) {
        showToast('At least one vehicle must be registered with the customer.', 'error');
        return;
    }
    
    const entry = document.getElementById(`vehicleEntry_${id}`);
    if (entry) {
        entry.remove();
        reIndexVehicles();
    }
}

function reIndexVehicles() {
    const cards = document.querySelectorAll('.vehicle-entry-card');
    cards.forEach((card, i) => {
        const titleSpan = card.querySelector('.vehicle-entry-title');
        titleSpan.textContent = `Vehicle Entry #${i + 1}`;
    });
}

// Gather Registration DTO
function gatherRegistrationData() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim() || null;

    const vehicles = [];
    document.querySelectorAll('.vehicle-entry-card').forEach((card) => {
        const idx = card.getAttribute('data-idx');
        vehicles.push({
            vehicleNumber: document.getElementById(`vehicleNumber_${idx}`).value.trim(),
            vehicleMake: document.getElementById(`vehicleMake_${idx}`).value.trim(),
            vehicleModel: document.getElementById(`vehicleModel_${idx}`).value.trim(),
            manufacturingYear: parseInt(document.getElementById(`manufacturingYear_${idx}`).value),
            vehicleType: document.getElementById(`vehicleType_${idx}`).value || null,
            color: document.getElementById(`color_${idx}`).value.trim() || null
        });
    });

    return { firstName, lastName, email, phone, vehicles };
}

// Form Submit Handler
async function handleRegisterSubmit(e) {
    e.preventDefault();

    // Reset error visuals
    document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('input, select').forEach(el => el.classList.remove('error'));

    // Validation checks
    let valid = true;
    
    const firstName = document.getElementById('firstName');
    const lastName = document.getElementById('lastName');
    const email = document.getElementById('email');

    if (!firstName.value.trim()) {
        showInputError('firstName', 'First name is required');
        valid = false;
    }
    if (!lastName.value.trim()) {
        showInputError('lastName', 'Last name is required');
        valid = false;
    }
    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        showInputError('email', 'A valid email address is required');
        valid = false;
    }

    document.querySelectorAll('.vehicle-entry-card').forEach((card) => {
        const idx = card.getAttribute('data-idx');
        const num = document.getElementById(`vehicleNumber_${idx}`);
        const make = document.getElementById(`vehicleMake_${idx}`);
        const model = document.getElementById(`vehicleModel_${idx}`);
        const yr = document.getElementById(`manufacturingYear_${idx}`);

        if (!num.value.trim()) {
            showInputError(`vehicleNumber_${idx}`, 'License number is required');
            valid = false;
        }
        if (!make.value.trim()) {
            showInputError(`vehicleMake_${idx}`, 'Make is required');
            valid = false;
        }
        if (!model.value.trim()) {
            showInputError(`vehicleModel_${idx}`, 'Model is required');
            valid = false;
        }
        if (!yr.value.trim() || parseInt(yr.value) < 1900 || parseInt(yr.value) > new Date().getFullYear() + 2) {
            showInputError(`manufacturingYear_${idx}`, 'A valid year is required');
            valid = false;
        }
    });

    if (!valid) return;

    toggleSpinner(true);
    const data = gatherRegistrationData();

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers/register-with-vehicles`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            showToast(`Registered customer "${result.firstName} ${result.lastName}" successfully!`, 'success');
            closeModal('createCustomerModal');
            // Refresh customer list
            fetchCustomers();
        } else if (response.status === 400 || response.status === 409) {
            const err = await response.json();
            showToast(err.message || 'Email registration conflict. A customer with this email already exists.', 'error');
        } else {
            throw new Error('Registration failed on server');
        }
    } catch (error) {
        console.error(error);
        showToast(`Registration error: ${error.message}`, 'error');
    } finally {
        toggleSpinner(false);
    }
}

function showInputError(id, msg) {
    const input = document.getElementById(id);
    if (input) {
        input.classList.add('error');
        const errEl = input.nextElementSibling;
        if (errEl && errEl.classList.contains('error-msg')) {
            errEl.textContent = msg;
        }
    }
}

function toggleSpinner(show) {
    if (show) loadingSpinner.classList.remove('hidden');
    else loadingSpinner.classList.add('hidden');
}


// 2. SHOW CUSTOMER PROFILE SUMMARY
async function showCustomerDetails(customerId) {
    toggleSpinner(true);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to retrieve customer profiles');
        
        const customer = await response.json();
        currentCustomerId = customerId;

        const initials = (customer.firstName[0] + customer.lastName[0]).toUpperCase();

        detailsModalContent.innerHTML = `
            <div class="profile-card">
                <div class="profile-avatar">${initials}</div>
                <div class="profile-name">${customer.firstName} ${customer.lastName}</div>
                <div class="profile-id">Customer ID: #${customer.id}</div>
                
                <div class="profile-meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Email Address</span>
                        <span class="meta-val">${customer.email}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Phone Number</span>
                        <span class="meta-val">${customer.phone || '—'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Total Vehicles</span>
                        <span class="meta-val">${customer.vehicles ? customer.vehicles.length : 0} registered</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Portal Status</span>
                        <span class="meta-val text-success" style="font-weight: 700;">● Staff Managed</span>
                    </div>
                </div>
            </div>
        `;

        openModal('customerDetailsModal');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        toggleSpinner(false);
    }
}


// 3. SHOW CUSTOMER REGISTERED VEHICLES
async function showCustomerVehicles(customerId) {
    toggleSpinner(true);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to retrieve customer vehicles');
        
        const customer = await response.json();
        vehicleModalSubtitle.textContent = `Vehicles registered for ${customer.firstName} ${customer.lastName}`;

        vehicleModalContent.innerHTML = '';
        if (!customer.vehicles || customer.vehicles.length === 0) {
            vehicleModalContent.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 30px;">
                    No vehicles registered for this customer yet.
                </div>
            `;
        } else {
            customer.vehicles.forEach(v => {
                const card = document.createElement('div');
                card.className = 'vehicle-detail-card';
                card.innerHTML = `
                    <div class="vehicle-plate-badge">${v.vehicleNumber}</div>
                    <div style="font-weight: 700; font-size: 1.1rem; color: #0b3c5d;">
                        ${v.vehicleMake} ${v.vehicleModel}
                    </div>
                    <div class="vehicle-card-info-grid">
                        <div><span class="meta-label">Year</span><br><strong>${v.manufacturingYear}</strong></div>
                        <div><span class="meta-label">Shape</span><br><strong>${v.vehicleType || '—'}</strong></div>
                        <div><span class="meta-label">Color</span><br><strong>${v.color || '—'}</strong></div>
                        <div><span class="meta-label">Portal ID</span><br><strong>Active</strong></div>
                    </div>
                `;
                vehicleModalContent.appendChild(card);
            });
        }

        openModal('customerVehicleModal');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        toggleSpinner(false);
    }
}


// 4. SHOW SALES & PURCHASE HISTORY MODAL
async function showCustomerHistory(customerId) {
    toggleSpinner(true);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Customer order history details not found');
        
        const historyData = await response.json();
        currentCustomerId = customerId;

        historyModalSubtitle.textContent = `Billing and purchases for ${historyData.customerName}`;
        
        // Bind statistics
        const sum = historyData.summary || {};
        histStatOrders.textContent = sum.totalOrders || 0;
        histStatSpent.textContent = `Rs. ${(sum.totalSpent || 0).toFixed(2)}`;
        histStatVehicles.textContent = sum.totalVehicles || 0;
        const avg = sum.totalOrders > 0 ? (sum.totalSpent / sum.totalOrders) : 0;
        histStatAvg.textContent = `Rs. ${avg.toFixed(2)}`;

        // Populate table body
        historyTableBody.innerHTML = '';
        const purchases = historyData.purchaseHistory || [];

        if (purchases.length === 0) {
            noHistoryMessage.classList.remove('hidden');
        } else {
            noHistoryMessage.classList.add('hidden');
            purchases.forEach(order => {
                const date = new Date(order.orderDate).toLocaleDateString();
                const total = order.totalAmount || 0;
                const discount = order.discountAmount || 0;
                const itemsCount = order.items ? order.items.length : 0;
                const orderIdVal = order.orderId || order.id;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>#${orderIdVal}</strong></td>
                    <td>${date}</td>
                    <td>${itemsCount} Item${itemsCount === 1 ? '' : 's'}</td>
                    <td>Rs. ${parseFloat(discount).toFixed(2)}</td>
                    <td><strong>Rs. ${parseFloat(total).toFixed(2)}</strong></td>
                    <td>
                        <span style="background-color: #d1fae5; color: #065f46; font-size: 0.75rem; padding: 2px 8px; border-radius: 10px; font-weight: 600;">
                            ${order.status || 'Success'}
                        </span>
                    </td>
                    <td class="text-right">
                        <button class="action-pill-btn btn-tbl-details btn-sm" onclick="showOrderItemsDetail(${orderIdVal})">
                            View Items
                        </button>
                    </td>
                `;
                historyTableBody.appendChild(tr);
            });
        }

        openModal('customerHistoryModal');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        toggleSpinner(false);
    }
}


// 5. VIEW DETAILED ITEMS IN HISTORIC ORDER
async function showOrderItemsDetail(orderId) {
    toggleSpinner(true);
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Order lines detail load failed');
        
        const order = await response.json();
        currentOrderId = orderId;

        orderDetailId.textContent = order.Id || order.id || orderId;
        orderItemsTbody.innerHTML = '';

        let sub = 0;
        const items = order.OrderItems || order.orderItems || [];
        
        items.forEach(item => {
            const name = item.ProductName || item.productName || 'Unknown Part';
            const qty = item.Quantity || item.quantity || 0;
            const price = item.UnitPrice || item.unitPrice || 0;
            const lineSub = qty * price;
            sub += lineSub;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${name}</strong></td>
                <td class="text-center">${qty}</td>
                <td class="text-right">Rs. ${price.toFixed(2)}</td>
                <td class="text-right"><strong>Rs. ${lineSub.toFixed(2)}</strong></td>
            `;
            orderItemsTbody.appendChild(tr);
        });

        const disc = order.DiscountAmount || order.discountAmount || 0;
        const tot = order.TotalAmount || order.totalAmount || 0;

        subTotal.textContent = `Rs. ${sub.toFixed(2)}`;
        discountAmount.textContent = `Rs. ${disc.toFixed(2)}`;
        orderTotal.textContent = `Rs. ${tot.toFixed(2)}`;

        openModal('orderDetailsDialog');
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        toggleSpinner(false);
    }
}

// 6. GENERATE AND PRINT SALES INVOICE WINDOW
async function printSalesInvoice() {
    toggleSpinner(true);
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${currentOrderId}/invoice`);
        if (!response.ok) throw new Error('Invoice render structure not found');

        const invoice = await response.json();
        const printWindow = window.open('', '', 'width=850,height=700');

        const items = invoice.Items || invoice.items || [];
        let itemsHtml = items.map(item => `
            <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">
                    ${item.PartName || item.partName || 'Parts Item'}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                    ${item.Quantity || item.quantity || 0}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
                    Rs. ${(item.UnitPrice || item.unitPrice || 0).toFixed(2)}
                </td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right; font-weight: bold;">
                    Rs. ${(item.Subtotal || item.subtotal || 0).toFixed(2)}
                </td>
            </tr>
        `).join('');

        const invNum = invoice.InvoiceNumber || invoice.invoiceNumber || 'INV-0000';
        const invDate = new Date(invoice.InvoiceDate || invoice.invoiceDate).toLocaleDateString();
        
        const customerName = invoice.Customer ? (invoice.Customer.Name || invoice.Customer.name || 'Customer') : 'Customer';
        const customerEmail = invoice.Customer ? (invoice.Customer.Email || invoice.Customer.email || '—') : '—';
        const customerPhone = invoice.Customer ? (invoice.Customer.Phone || invoice.Customer.phone || '—') : '—';

        const subBill = invoice.SubTotal || invoice.subTotal || 0;
        const discBill = invoice.DiscountAmount || invoice.discountAmount || 0;
        const totBill = invoice.TotalAmount || invoice.totalAmount || 0;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invNum}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
                    .invoice-card { max-width: 800px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
                    .header-flex { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo-title h1 { margin: 0; color: #0b3c5d; font-size: 2.2rem; font-weight: 800; letter-spacing: -0.5px; }
                    .logo-title p { margin: 4px 0 0; color: #64748b; font-size: 0.95rem; }
                    .invoice-info { text-align: right; }
                    .invoice-info h2 { margin: 0; color: #0f172a; font-size: 1.5rem; }
                    .invoice-info p { margin: 5px 0; color: #64748b; }
                    .addresses-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
                    .address-block h3 { margin: 0 0 10px; font-size: 0.9rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
                    .address-block p { margin: 4px 0; font-size: 1rem; font-weight: 600; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
                    th { background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; text-align: left; font-size: 0.85rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
                    .totals-box { width: 320px; margin-left: auto; margin-right: 0; display: flex; flex-direction: column; gap: 8px; border-top: 2px solid #0f172a; padding-top: 15px; }
                    .totals-line { display: flex; justify-content: space-between; font-size: 0.95rem; color: #64748b; }
                    .totals-line.grand { color: #0f172a; font-weight: bold; font-size: 1.25rem; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 4px; }
                    .footer-note { text-align: center; margin-top: 50px; color: #94a3b8; font-size: 0.85rem; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                    @media print { body { margin: 0; } .invoice-card { border: none; padding: 0; } }
                </style>
            </head>
            <body>
                <div class="invoice-card">
                    <div class="header-flex">
                        <div class="logo-title">
                            <h1>AUTOSERVE</h1>
                            <p>Premium Vehicle Parts & Diagnostics Portal</p>
                        </div>
                        <div class="invoice-info">
                            <h2>SALES INVOICE</h2>
                            <p><strong>Invoice Number:</strong> ${invNum}</p>
                            <p><strong>Billing Date:</strong> ${invDate}</p>
                        </div>
                    </div>

                    <div class="addresses-grid">
                        <div class="address-block">
                            <h3>Billed To:</h3>
                            <p>${customerName}</p>
                            <div style="font-size: 0.9rem; color: #64748b; margin-top: 5px;">
                                Email: ${customerEmail}<br>
                                Phone: ${customerPhone}
                            </div>
                        </div>
                        <div class="address-block" style="text-align: right;">
                            <h3>Issued By:</h3>
                            <p>AutoServe Parts Hub</p>
                            <div style="font-size: 0.9rem; color: #64748b; margin-top: 5px;">
                                Kathmandu Branch Office<br>
                                Contact: +977-1-4XXXXXX
                            </div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Part Description</th>
                                <th style="text-align: center;">Qty</th>
                                <th style="text-align: right;">Unit Price</th>
                                <th style="text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="totals-box">
                        <div class="totals-line">
                            <span>Total Items Subtotal:</span>
                            <span>Rs. ${subBill.toFixed(2)}</span>
                        </div>
                        <div class="totals-line">
                            <span>Special Promo Discount:</span>
                            <span>Rs. ${discBill.toFixed(2)}</span>
                        </div>
                        <div class="totals-line grand">
                            <span>Total Invoice Bill:</span>
                            <span>Rs. ${totBill.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="footer-note">
                        <p>Thank you for choosing AutoServe for your vehicle accessories! All parts carry a standard manufacturer warranty.</p>
                        <p style="margin-top: 5px; font-weight: bold;">Computer generated copy. No physical signature is required.</p>
                    </div>
                </div>
                <script>
                    window.print();
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    } catch (error) {
        showToast(`Print Invoice Error: ${error.message}`, 'error');
    } finally {
        toggleSpinner(false);
    }
}
