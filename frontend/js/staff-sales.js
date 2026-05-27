// Staff Sales Page JavaScript

const API_BASE_URL = 'http://localhost:5033/api';

// ELEMENTS
// ... (rest of elements will be handled by context)

// Auth check on load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || (role !== 'Staff' && role !== 'Admin')) {
        window.location.href = 'login.html';
        return;
    }
    
    // Initial data load
    fetchProducts();
    loadRecentInvoices();
});

// Elements
const salesForm = document.getElementById('salesForm');
const customerId = document.getElementById('customerId');
const searchCustomerBtn = document.getElementById('searchCustomerBtn');
const customerDetailsDisplay = document.getElementById('customerDetailsDisplay');
const displayName = document.getElementById('displayName');
const displayEmail = document.getElementById('displayEmail');
const displayPhone = document.getElementById('displayPhone');
const addItemBtn = document.getElementById('addItemBtn');
const itemsContainer = document.getElementById('itemsContainer');
const noItemsMsg = document.getElementById('noItemsMsg');
const summarySubtotal = document.getElementById('summarySubtotal');
const summaryDiscount = document.getElementById('summaryDiscount');
const summaryTotal = document.getElementById('summaryTotal');
const recentInvoicesTable = document.getElementById('recentInvoicesTable');
const recentInvoicesTbody = document.getElementById('recentInvoicesTbody');
const noInvoicesMsg = document.getElementById('noInvoicesMsg');
const alertMessage = document.getElementById('alertMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
const invoiceDialog = document.getElementById('invoiceDialog');
const invoiceNumber = document.getElementById('invoiceNumber');
const invoiceContent = document.getElementById('invoiceContent');
const closeInvoiceDialog = document.getElementById('closeInvoiceDialog');
const closeInvoiceBtn = document.getElementById('closeInvoiceBtn');
const printInvoiceBtn = document.getElementById('printInvoiceBtn');
const downloadInvoiceBtn = document.getElementById('downloadInvoiceBtn');

let currentCustomer = null;
let currentInvoiceId = null;
let items = [];
let availableProducts = [];
let itemCounter = 0;

// Event Listeners
searchCustomerBtn.addEventListener('click', handleCustomerSearch);
customerId.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleCustomerSearch();
});
addItemBtn.addEventListener('click', addNewItem);
salesForm.addEventListener('submit', handleCreateInvoice);
closeInvoiceDialog.addEventListener('click', () => invoiceDialog.close());
closeInvoiceBtn.addEventListener('click', () => invoiceDialog.close());
printInvoiceBtn.addEventListener('click', printInvoice);
downloadInvoiceBtn.addEventListener('click', downloadInvoice);

/**
 * Fetch all products
 */
async function fetchProducts() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            availableProducts = await response.json();
            console.log('Products loaded:', availableProducts.length);
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

/**
 * Search and load customer
 */
async function handleCustomerSearch() {
    const custId = customerId.value.trim();
    
    if (!custId || custId < 1) {
        showAlert('Please enter a valid customer ID', 'error');
        return;
    }

    try {
        console.log(`Loading customer ID: ${custId}`);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers/${custId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });
        
        console.log(`Customer fetch response status: ${response.status}`);
        if (!response.ok) {
            if (response.status === 404) {
                showAlert('Customer not found', 'error');
            } else {
                throw new Error('Failed to load customer');
            }
            return;
        }

        const customer = await response.json();
        console.log('Customer loaded:', customer);
        currentCustomer = customer;
        displayCustomer(customer);
    } catch (error) {
        console.error('Error loading customer:', error);
        console.error('Full error:', error.message);
        showAlert(`Error loading customer details: ${error.message}`, 'error');
    }
}

/**
 * Display customer information
 */
function displayCustomer(customer) {
    displayName.textContent = `${customer.firstName} ${customer.lastName}`;
    displayEmail.textContent = customer.email;
    displayPhone.textContent = customer.phone || '—';
    customerDetailsDisplay.classList.remove('hidden');
    showAlert(`Customer "${customer.firstName} ${customer.lastName}" loaded successfully`, 'success');
}

/**
 * Add new sales item
 */
async function addNewItem() {
    if (!currentCustomer) {
        showAlert('Please search and select a customer first', 'error');
        return;
    }

    itemCounter++;
    const itemId = `item-${itemCounter}`;
    
    // Fetch products if not already done
    if (availableProducts.length === 0) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                availableProducts = await response.json();
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    const itemDiv = document.createElement('div');
    itemDiv.className = 'sales-item';
    itemDiv.id = itemId;

    let productOptions = '<option value="">Select a product</option>';
    availableProducts.forEach(product => {
        productOptions += `<option value="${product.id}" data-price="${product.price}">${product.name}</option>`;
    });

    itemDiv.innerHTML = `
        <div class="item-header">
            <span class="item-number">Item ${itemCounter}</span>
            <button type="button" class="btn-remove-item" onclick="removeItem('${itemId}')">Remove</button>
        </div>
        <div class="item-form-row">
            <div class="form-group">
                <label>Product *</label>
                <select class="product-select" onchange="updateItemPrice('${itemId}')">
                    ${productOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Unit Price (Rs.) *</label>
                <input type="number" class="unit-price" step="0.01" min="0" value="0" required readonly>
            </div>
            <div class="form-group">
                <label>Quantity *</label>
                <input type="number" class="quantity" step="1" min="1" value="1" required onchange="updateTotal('${itemId}')">
            </div>
            <div class="form-group">
                <label>Subtotal (Rs.)</label>
                <input type="number" class="subtotal" step="0.01" min="0" value="0" readonly>
            </div>
        </div>
        <div class="item-total">
            Subtotal: <span class="item-subtotal">Rs. 0.00</span>
        </div>
    `;

    itemsContainer.appendChild(itemDiv);
    noItemsMsg.style.display = 'none';
    
    // Store item reference
    items.push({
        id: itemId,
        productId: 0,
        quantity: 1,
        unitPrice: 0
    });

    updateTotal(itemId);
}

/**
 * Update item price when product is selected
 */
function updateItemPrice(itemId) {
    const itemDiv = document.getElementById(itemId);
    const productSelect = itemDiv.querySelector('.product-select');
    const unitPriceInput = itemDiv.querySelector('.unit-price');
    
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const price = selectedOption.dataset.price || 0;
    
    unitPriceInput.value = price;
    updateTotal(itemId);
}

/**
 * Update item total and order summary
 */
function updateTotal(itemId) {
    const itemDiv = document.getElementById(itemId);
    const quantityInput = itemDiv.querySelector('.quantity');
    const unitPriceInput = itemDiv.querySelector('.unit-price');
    const subtotalInput = itemDiv.querySelector('.subtotal');
    const itemSubtotalSpan = itemDiv.querySelector('.item-subtotal');

    const quantity = parseFloat(quantityInput.value) || 0;
    const unitPrice = parseFloat(unitPriceInput.value) || 0;
    const subtotal = quantity * unitPrice;

    subtotalInput.value = subtotal;
    itemSubtotalSpan.textContent = `Rs. ${subtotal.toFixed(2)}`;

    // Update order summary
    updateOrderSummary();
}

/**
 * Update order summary
 */
function updateOrderSummary() {
    let subtotal = 0;

    document.querySelectorAll('.sales-item').forEach(itemDiv => {
        const subtotalInput = itemDiv.querySelector('.subtotal');
        subtotal += parseFloat(subtotalInput.value) || 0;
    });

    // Calculate discount (10% if subtotal > 5000)
    let discount = 0;
    if (subtotal > 5000) {
        discount = subtotal * 0.10;
    }

    const total = subtotal - discount;

    summarySubtotal.textContent = `Rs. ${subtotal.toFixed(2)}`;
    summaryDiscount.textContent = `Rs. ${discount.toFixed(2)}`;
    summaryTotal.textContent = `Rs. ${total.toFixed(2)}`;
}

/**
 * Remove item from list
 */
function removeItem(itemId) {
    const itemDiv = document.getElementById(itemId);
    itemDiv.remove();

    // Remove from items array
    items = items.filter(item => item.id !== itemId);

    if (document.querySelectorAll('.sales-item').length === 0) {
        noItemsMsg.style.display = 'block';
    }

    updateOrderSummary();
}

/**
 * Create sales invoice
 */
async function handleCreateInvoice(e) {
    e.preventDefault();

    if (!currentCustomer) {
        showAlert('Please select a customer', 'error');
        return;
    }

    const itemElements = document.querySelectorAll('.sales-item');
    if (itemElements.length === 0) {
        showAlert('Please add at least one item to the invoice', 'error');
        return;
    }

    // Collect order items
    const orderItems = [];
    itemElements.forEach(itemDiv => {
        const productSelect = itemDiv.querySelector('.product-select');
        const quantity = parseFloat(itemDiv.querySelector('.quantity').value) || 0;
        const unitPrice = parseFloat(itemDiv.querySelector('.unit-price').value) || 0;

        if (productSelect.value && quantity > 0 && unitPrice > 0) {
            orderItems.push({
                productId: parseInt(productSelect.value),
                quantity: quantity,
                unitPrice: unitPrice
            });
        }
    });

    if (orderItems.length === 0) {
        showAlert('Please fill in all item details properly', 'error');
        return;
    }

    // Create order DTO
    const orderDto = {
        customerId: currentCustomer.id,
        orderDate: new Date().toISOString(),
        status: 'Completed',
        items: orderItems
    };

    try {
        loadingSpinner.classList.remove('hidden');

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/create-invoice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderDto)
        });

        loadingSpinner.classList.add('hidden');

        if (!response.ok) {
            throw new Error('Failed to create invoice');
        }

        const invoice = await response.json();
        currentInvoiceId = invoice.id || invoice.Id;
        
        // Reset form
        itemsContainer.innerHTML = '';
        items = [];
        itemCounter = 0;
        noItemsMsg.style.display = 'block';
        updateOrderSummary();
        
        // Reload recent invoices
        loadRecentInvoices();

        // Immediately pop open the invoice view for preview/print/download
        await viewInvoice(currentInvoiceId);
        
        showAlert(`Invoice INV-${currentInvoiceId.toString().padStart(5, '0')} created successfully!`, 'success');
    } catch (error) {
        loadingSpinner.classList.add('hidden');
        console.error('Error creating invoice:', error);
        showAlert('Error creating invoice. Please try again.', 'error');
    }
}

/**
 * Load recent invoices
 */
async function loadRecentInvoices() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/with-details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            return;
        }

        const orders = await response.json();
        displayRecentInvoices(orders.slice(0, 10)); // Show last 10
    } catch (error) {
        console.error('Error loading recent invoices:', error);
    }
}

/**
 * Display recent invoices
 */
function displayRecentInvoices(orders) {
    recentInvoicesTbody.innerHTML = '';

    if (!orders || orders.length === 0) {
        recentInvoicesTable.style.display = 'none';
        noInvoicesMsg.style.display = 'block';
        return;
    }

    recentInvoicesTable.style.display = 'table';
    noInvoicesMsg.style.display = 'none';

    orders.forEach(order => {
        const id = order.id !== undefined ? order.id : order.Id;
        const rawDate = order.orderDate || order.OrderDate;
        const orderDate = new Date(rawDate).toLocaleDateString();
        
        const customer = order.customer || order.Customer;
        let customerName = '—';
        if (customer) {
            const fName = customer.firstName || customer.FirstName || '';
            const lName = customer.lastName || customer.LastName || '';
            customerName = `${fName} ${lName}`.trim() || '—';
        }
        
        const orderItems = order.orderItems || order.OrderItems || [];
        const itemCount = orderItems.length;
        
        const totalAmount = order.totalAmount !== undefined ? order.totalAmount : (order.TotalAmount || 0);
        const discountAmount = order.discountAmount !== undefined ? order.discountAmount : (order.DiscountAmount || 0);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>INV-${id.toString().padStart(5, '0')}</td>
            <td>${customerName}</td>
            <td>${orderDate}</td>
            <td>${itemCount}</td>
            <td>Rs. ${totalAmount.toFixed(2)}</td>
            <td>Rs. ${discountAmount.toFixed(2)}</td>
            <td>
                <button class="table-action btn-view" onclick="viewInvoice(${id})">View</button>
                <button class="table-action btn-print" onclick="printOrderInvoice(${id})">Print</button>
            </td>
        `;

        recentInvoicesTbody.appendChild(row);
    });
}

/**
 * View invoice details
 */
async function viewInvoice(invoiceId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${invoiceId}/invoice`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load invoice');
        }

        const invoice = await response.json();
        currentInvoiceId = invoiceId;

        const invNum = invoice.invoiceNumber || invoice.InvoiceNumber || '';
        invoiceNumber.textContent = invNum;
        
        const itemsList = invoice.items || invoice.Items || [];
        let itemsHtml = itemsList.map(item => {
            const name = item.partName || item.PartName || 'Part';
            const qty = item.quantity || item.Quantity || 0;
            const price = item.unitPrice !== undefined ? item.unitPrice : (item.UnitPrice || 0);
            const sub = item.subtotal !== undefined ? item.subtotal : (item.Subtotal || 0);
            return `
                <div class="invoice-item">
                    <span>${name}</span>
                    <span>Qty: ${qty} × Rs. ${price.toFixed(2)} = Rs. ${sub.toFixed(2)}</span>
                </div>
            `;
        }).join('');

        const customer = invoice.customer || invoice.Customer || {};
        const custName = customer.name || customer.Name || '—';
        const custEmail = customer.email || customer.Email || '—';
        const custPhone = customer.phone || customer.Phone || '—';

        const subTotalVal = invoice.subTotal !== undefined ? invoice.subTotal : (invoice.SubTotal || 0);
        const discountVal = invoice.discountAmount !== undefined ? invoice.discountAmount : (invoice.DiscountAmount || 0);
        const totalVal = invoice.totalAmount !== undefined ? invoice.totalAmount : (invoice.TotalAmount || 0);

        invoiceContent.innerHTML = `
            <div class="invoice-section">
                <h3>Customer</h3>
                <p><strong>${custName}</strong></p>
                <p>${custEmail}</p>
                <p>${custPhone}</p>
            </div>
            <div class="invoice-section">
                <h3>Items</h3>
                ${itemsHtml}
            </div>
            <div class="invoice-section">
                <div class="invoice-item">
                    <span>Subtotal:</span>
                    <span>Rs. ${subTotalVal.toFixed(2)}</span>
                </div>
                <div class="invoice-item">
                    <span>Discount:</span>
                    <span>Rs. ${discountVal.toFixed(2)}</span>
                </div>
                <div class="invoice-item total">
                    <span>Total:</span>
                    <span>Rs. ${totalVal.toFixed(2)}</span>
                </div>
            </div>
        `;

        invoiceDialog.showModal();
    } catch (error) {
        console.error('Error loading invoice:', error);
        showAlert('Error loading invoice', 'error');
    }
}

/**
 * Print invoice
 */
function printInvoice() {
    try {
        const heading = invoiceNumber.textContent;
        const content = invoiceContent.innerHTML;

        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${heading}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h2 { text-align: center; }
                    h3 { margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
                    .invoice-item { display: flex; justify-content: space-between; padding: 10px 0; }
                    .invoice-item.total { border-top: 2px solid #333; font-weight: bold; font-size: 1.2em; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <h2>${heading}</h2>
                ${content}
                <script>
                    window.print();
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    } catch (error) {
        console.error('Error printing invoice:', error);
        showAlert('Error printing invoice', 'error');
    }
}

/**
 * Download invoice
 */
async function downloadInvoice() {
    try {
        if (!currentInvoiceId) {
            showAlert('No invoice loaded to download', 'error');
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${currentInvoiceId}/invoice`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            throw new Error('Failed to load invoice print template');
        }

        const invoice = await response.json();
        const invNum = invoice.invoiceNumber || invoice.InvoiceNumber || 'INV-00000';
        
        const customer = invoice.customer || invoice.Customer || {};
        const custName = customer.name || customer.Name || 'Customer';
        const custEmail = customer.email || customer.Email || '—';
        const custPhone = customer.phone || customer.Phone || '—';

        const subTotalVal = invoice.subTotal !== undefined ? invoice.subTotal : (invoice.SubTotal || 0);
        const discountVal = invoice.discountAmount !== undefined ? invoice.discountAmount : (invoice.DiscountAmount || 0);
        const totalVal = invoice.totalAmount !== undefined ? invoice.totalAmount : (invoice.TotalAmount || 0);

        const itemsList = invoice.items || invoice.Items || [];
        let itemsHtml = itemsList.map(item => {
            const name = item.partName || item.PartName || 'Part';
            const qty = item.quantity || item.Quantity || 0;
            const price = item.unitPrice !== undefined ? item.unitPrice : (item.UnitPrice || 0);
            const sub = item.subtotal !== undefined ? item.subtotal : (item.Subtotal || 0);
            return `
                <tr>
                    <td style="padding: 12px; border: 1px solid #cbd5e1;">${name}</td>
                    <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">${qty}</td>
                    <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">Rs. ${price.toFixed(2)}</td>
                    <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">Rs. ${sub.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice ${invNum} - AutoServe</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
                    .invoice-card { max-width: 800px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                    .header-flex { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
                    .logo-title h1 { margin: 0; color: #0b3c5d; font-size: 2.2rem; font-weight: 800; }
                    .logo-title p { margin: 4px 0 0; color: #64748b; font-size: 0.95rem; }
                    .invoice-info { text-align: right; }
                    .invoice-info h2 { margin: 0; color: #0f172a; font-size: 1.5rem; }
                    .invoice-info p { margin: 5px 0; color: #64748b; }
                    .addresses-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
                    .address-block h3 { margin: 0 0 10px; font-size: 0.9rem; text-transform: uppercase; color: #64748b; }
                    .address-block p { margin: 4px 0; font-size: 1rem; font-weight: 600; color: #1e293b; }
                    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
                    th { background: #f8fafc; padding: 12px; border: 1px solid #cbd5e1; text-align: left; font-size: 0.85rem; text-transform: uppercase; color: #64748b; }
                    .totals-box { width: 320px; margin-left: auto; display: flex; flex-direction: column; gap: 8px; border-top: 2px solid #0f172a; padding-top: 15px; }
                    .totals-line { display: flex; justify-content: space-between; font-size: 0.95rem; color: #64748b; }
                    .totals-line.grand { color: #0f172a; font-weight: bold; font-size: 1.25rem; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 4px; }
                    .footer-note { text-align: center; margin-top: 50px; color: #94a3b8; font-size: 0.85rem; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                    .download-btn { display: inline-block; background-color: #0b3c5d; color: white; padding: 10px 20px; border-radius: 6px; font-weight: bold; text-decoration: none; margin-bottom: 20px; }
                    @media print { .download-btn { display: none; } body { margin: 0; } .invoice-card { border: none; padding: 0; box-shadow: none; } }
                </style>
            </head>
            <body>
                <div class="invoice-card">
                    <div style="text-align: right;">
                        <a href="javascript:window.print()" class="download-btn">Print / Save as PDF</a>
                    </div>
                    <div class="header-flex">
                        <div class="logo-title">
                            <h1>AUTOSERVE</h1>
                            <p>Premium Vehicle Parts & Diagnostics Portal</p>
                        </div>
                        <div class="invoice-info">
                            <h2>SALES INVOICE</h2>
                            <p><strong>Invoice Number:</strong> ${invNum}</p>
                            <p><strong>Billing Date:</strong> ${new Date(invoice.invoiceDate || invoice.InvoiceDate || new Date()).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div class="addresses-grid">
                        <div class="address-block">
                            <h3>Billed To:</h3>
                            <p>${custName}</p>
                            <div style="font-size: 0.9rem; color: #64748b; margin-top: 5px;">
                                Email: ${custEmail}<br>
                                Phone: ${custPhone}
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
                            <span>Subtotal:</span>
                            <span>Rs. ${subTotalVal.toFixed(2)}</span>
                        </div>
                        <div class="totals-line">
                            <span>Discount:</span>
                            <span>Rs. ${discountVal.toFixed(2)}</span>
                        </div>
                        <div class="totals-line grand">
                            <span>Total Invoice Bill:</span>
                            <span>Rs. ${totalVal.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="footer-note">
                        <p>Thank you for choosing AutoServe! All parts carry a standard warranty.</p>
                        <p style="margin-top: 5px; font-weight: bold;">Computer generated copy. No physical signature is required.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invNum}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert('Invoice downloaded successfully! You can open the downloaded HTML and print/save it as PDF.', 'success');
    } catch (error) {
        console.error('Error downloading invoice:', error);
        showAlert('Error downloading invoice', 'error');
    }
}

/**
 * Print order invoice
 */
function printOrderInvoice(invoiceId) {
    viewInvoice(invoiceId);
    setTimeout(() => {
        printInvoice();
    }, 500);
}

/**
 * Show alert message
 */
function showAlert(message, type) {
    alertMessage.textContent = message;
    alertMessage.className = `alert ${type}`;
    
    setTimeout(() => {
        alertMessage.classList.add('hidden');
    }, 4000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const custId = params.get('customerId');
    
    if (custId) {
        customerId.value = custId;
        handleCustomerSearch();
    }

    loadRecentInvoices();
});
