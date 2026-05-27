// Staff Customer Detail Page JavaScript

const API_BASE_URL = 'http://localhost:5033/api';

// Elements
const customerIdInput = document.getElementById('customerIdInput');
const loadHistoryBtn = document.getElementById('loadHistoryBtn');
const backBtn = document.getElementById('backBtn');
const customerInfoSection = document.getElementById('customerInfoSection');
const tabBar = document.getElementById('tabBar');
const tabPurchases = document.getElementById('tabPurchases');
const tabVehicles = document.getElementById('tabVehicles');
const purchaseSection = document.getElementById('purchaseSection');
const vehicleSection = document.getElementById('vehicleSection');
const customerName = document.getElementById('customerName');
const customerEmail = document.getElementById('customerEmail');
const customerPhone = document.getElementById('customerPhone');
const statOrders = document.getElementById('statOrders');
const statSpent = document.getElementById('statSpent');
const statVehicles = document.getElementById('statVehicles');
const statAvgOrder = document.getElementById('statAvgOrder');
const purchaseTbody = document.getElementById('purchaseTbody');
const noPurchasesMsg = document.getElementById('noPurchasesMsg');
const vehiclesList = document.getElementById('vehiclesList');
const noVehiclesMsg = document.getElementById('noVehiclesMsg');
const alertMessage = document.getElementById('alertMessage');
const orderDetailsDialog = document.getElementById('orderDetailsDialog');
const orderDetailId = document.getElementById('orderDetailId');
const orderItemsTbody = document.getElementById('orderItemsTbody');
const subTotal = document.getElementById('subTotal');
const discountAmount = document.getElementById('discountAmount');
const orderTotal = document.getElementById('orderTotal');
const closeOrderDialog = document.getElementById('closeOrderDialog');
const closeOrderBtn = document.getElementById('closeOrderBtn');
const printInvoiceBtn = document.getElementById('printInvoiceBtn');

let currentCustomerId = null;
let currentOrderId = null;

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || (role !== 'Staff' && role !== 'Admin')) {
        window.location.href = 'login.html';
        return;
    }

    // Check if customer ID is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    if (idParam) {
        customerIdInput.value = idParam;
        handleLoadHistory();
    }
});

// Event Listeners
loadHistoryBtn.addEventListener('click', handleLoadHistory);
customerIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLoadHistory();
});
backBtn.addEventListener('click', () => {
    window.history.back();
});
tabPurchases.addEventListener('click', switchToPurchases);
tabVehicles.addEventListener('click', switchToVehicles);
closeOrderDialog.addEventListener('click', () => orderDetailsDialog.close());
closeOrderBtn.addEventListener('click', () => orderDetailsDialog.close());
printInvoiceBtn.addEventListener('click', printInvoice);

/**
 * Load customer history and details
 */
async function handleLoadHistory() {
    const customerId = customerIdInput.value.trim();
    
    if (!customerId || customerId < 1) {
        showAlert('Please enter a valid customer ID', 'error');
        return;
    }

    try {
        console.log(`Fetching customer history for ID: ${customerId}`);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}/history`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            mode: 'cors'
        });
        
        console.log(`Response status: ${response.status}`);
        if (!response.ok) {
            if (response.status === 404) {
                showAlert('Customer not found', 'error');
            } else {
                throw new Error('Failed to load history');
            }
            return;
        }

        const historyData = await response.json();
        console.log('History data received:', historyData);
        currentCustomerId = customerId;
        displayCustomerHistory(historyData);
    } catch (error) {
        console.error('Error loading history:', error);
        console.error('Full error:', error.message);
        showAlert(`Error loading customer history: ${error.message}`, 'error');
    }
}

/**
 * Display customer history
 */
function displayCustomerHistory(historyData) {
    // API returns lowercase property names
    const { customerName: name, email, phone, vehicles, purchaseHistory, summary } = historyData;

    // Display customer info (customerName is the HTML element)
    customerName.textContent = name || '—';
    customerEmail.textContent = email || '—';
    customerPhone.textContent = phone || '—';

    // Display statistics - use defaults if summary is not available
    const summaryData = summary || {};
    statOrders.textContent = summaryData.totalOrders || 0;
    statSpent.textContent = `Rs. ${(summaryData.totalSpent || 0).toFixed(2)}`;
    statVehicles.textContent = summaryData.totalVehicles || (vehicles ? vehicles.length : 0);
    const avgOrder = summaryData.totalOrders > 0 ? (summaryData.totalSpent / summaryData.totalOrders).toFixed(2) : '0.00';
    statAvgOrder.textContent = `Rs. ${avgOrder}`;

    // Display purchases
    displayPurchases(purchaseHistory || []);

    // Display vehicles
    displayVehicles(vehicles || []);

    // Show sections
    customerInfoSection.classList.remove('hidden');
    tabBar.classList.remove('hidden');
}

/**
 * Display purchase history
 */
function displayPurchases(orders) {
    purchaseTbody.innerHTML = '';

    if (!orders || orders.length === 0) {
        purchaseTbody.parentElement.style.display = 'none';
        noPurchasesMsg.style.display = 'block';
        return;
    }

    purchaseTbody.parentElement.style.display = 'table';
    noPurchasesMsg.style.display = 'none';

    orders.forEach(order => {
        const orderDate = new Date(order.orderDate).toLocaleDateString();
        const row = document.createElement('tr');
        
        // API returns lowercase properties
        const totalAmount = order.totalAmount || 0;
        const discountAmount = order.discountAmount || 0;
        const itemCount = (order.items && order.items.length) || 0;

        row.innerHTML = `
            <td>${order.orderId || order.id || ''}</td>
            <td>${orderDate}</td>
            <td>${itemCount}</td>
            <td>Rs. ${parseFloat(totalAmount).toFixed(2)}</td>
            <td>Rs. ${parseFloat(discountAmount).toFixed(2)}</td>
            <td>${order.status || 'Pending'}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewOrderDetails(${order.orderId || order.id})">Details</button>
                <button class="action-btn btn-print" onclick="printOrder(${order.orderId || order.id})">Print</button>
            </td>
        `;

        purchaseTbody.appendChild(row);
    });
}

/**
 * Display vehicles
 */
function displayVehicles(vehicles) {
    vehiclesList.innerHTML = '';

    if (!vehicles || vehicles.length === 0) {
        vehiclesList.style.display = 'none';
        noVehiclesMsg.style.display = 'block';
        return;
    }

    vehiclesList.style.display = 'grid';
    noVehiclesMsg.style.display = 'none';

    vehicles.forEach(vehicle => {
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        card.innerHTML = `
            <h4>${vehicle.vehicleNumber}</h4>
            <p><strong>Make:</strong> ${vehicle.vehicleMake}</p>
            <p><strong>Model:</strong> ${vehicle.vehicleModel}</p>
            <p><strong>Year:</strong> ${vehicle.manufacturingYear}</p>
            <p><strong>Type:</strong> ${vehicle.vehicleType || '—'}</p>
            <p><strong>Color:</strong> ${vehicle.color || '—'}</p>
        `;
        vehiclesList.appendChild(card);
    });
}

/**
 * View order details
 */
async function viewOrderDetails(orderId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load order details');
        }

        const order = await response.json();
        currentOrderId = orderId;

        orderDetailId.textContent = order.Id;
        orderItemsTbody.innerHTML = '';

        let totalBefore = 0;
        order.OrderItems.forEach(item => {
            const subtotal = item.Quantity * item.UnitPrice;
            totalBefore += subtotal;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.ProductName}</td>
                <td>${item.Quantity}</td>
                <td>Rs. ${item.UnitPrice.toFixed(2)}</td>
                <td>Rs. ${subtotal.toFixed(2)}</td>
            `;
            orderItemsTbody.appendChild(row);
        });

        subTotal.textContent = `Rs. ${totalBefore.toFixed(2)}`;
        discountAmount.textContent = `Rs. ${order.DiscountAmount.toFixed(2)}`;
        orderTotal.textContent = `Rs. ${order.TotalAmount.toFixed(2)}`;

        orderDetailsDialog.showModal();
    } catch (error) {
        console.error('Error loading order details:', error);
        showAlert('Error loading order details', 'error');
    }
}

/**
 * Print invoice
 */
async function printInvoice() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders/${currentOrderId}/invoice`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load invoice');
        }

        const invoice = await response.json();
        const printWindow = window.open('', '', 'width=800,height=600');

        let itemsHtml = invoice.Items.map(item => `
            <tr>
                <td>${item.PartName}</td>
                <td style="text-align: right;">${item.Quantity}</td>
                <td style="text-align: right;">Rs. ${item.UnitPrice.toFixed(2)}</td>
                <td style="text-align: right;">Rs. ${item.Subtotal.toFixed(2)}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice ${invoice.InvoiceNumber}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #333; }
                    .header p { margin: 5px 0; color: #666; }
                    .customer-info { margin-bottom: 20px; }
                    .customer-info p { margin: 5px 0; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; text-align: left; }
                    td { padding: 10px; border: 1px solid #ddd; }
                    .totals { width: 300px; margin-left: auto; margin-right: 0; }
                    .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
                    .totals-row.total { border-top: 2px solid #333; font-weight: bold; font-size: 1.2em; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>SALES INVOICE</h1>
                    <p><strong>${invoice.InvoiceNumber}</strong></p>
                    <p>${new Date(invoice.InvoiceDate).toLocaleDateString()}</p>
                </div>
                <div class="customer-info">
                    <h3>Bill To:</h3>
                    <p><strong>${invoice.Customer.Name}</strong></p>
                    <p>${invoice.Customer.Email}</p>
                    <p>${invoice.Customer.Phone}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Part Name</th>
                            <th style="text-align: right;">Qty</th>
                            <th style="text-align: right;">Unit Price</th>
                            <th style="text-align: right;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div class="totals">
                    <div class="totals-row">
                        <span>Subtotal:</span>
                        <span>Rs. ${invoice.SubTotal.toFixed(2)}</span>
                    </div>
                    <div class="totals-row">
                        <span>Discount (10%):</span>
                        <span>Rs. ${invoice.DiscountAmount.toFixed(2)}</span>
                    </div>
                    <div class="totals-row total">
                        <span>Total:</span>
                        <span>Rs. ${invoice.TotalAmount.toFixed(2)}</span>
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
        console.error('Error printing invoice:', error);
        showAlert('Error printing invoice', 'error');
    }
}

/**
 * Print order (same as view details but prints)
 */
function printOrder(orderId) {
    currentOrderId = orderId;
    printInvoice();
}

/**
 * Switch to purchases tab
 */
function switchToPurchases() {
    tabPurchases.classList.add('active');
    tabVehicles.classList.remove('active');
    purchaseSection.classList.remove('hidden');
    vehicleSection.classList.add('hidden');
}

/**
 * Switch to vehicles tab
 */
function switchToVehicles() {
    tabVehicles.classList.add('active');
    tabPurchases.classList.remove('active');
    vehicleSection.classList.remove('hidden');
    purchaseSection.classList.add('hidden');
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
    const customerId = params.get('id');
    
    if (customerId) {
        customerIdInput.value = customerId;
        handleLoadHistory();
    } else {
        customerIdInput.focus();
    }
});
