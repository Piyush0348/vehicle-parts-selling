/**
 * Customer Registration JavaScript
 * Handles dynamic vehicle form management and API communication
 */

const API_BASE_URL = 'http://localhost:5033/api'; // Update with your API endpoint
let vehicleCount = 0;

// Initialize the form
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('customerRegistrationForm');
    const addVehicleBtn = document.getElementById('addVehicleBtn');
    const vehiclesContainer = document.getElementById('vehiclesContainer');

    // Add initial vehicle entry
    addVehicleEntry();

    // Event Listeners
    addVehicleBtn.addEventListener('click', addVehicleEntry);
    form.addEventListener('submit', handleFormSubmit);
});

/**
 * Add a new vehicle entry to the form
 */
function addVehicleEntry() {
    const vehiclesContainer = document.getElementById('vehiclesContainer');
    vehicleCount++;

    const vehicleHTML = `
        <div class="vehicle-entry" data-vehicle-id="${vehicleCount}">
            <div class="vehicle-header">
                <span class="vehicle-title">Vehicle #${vehicleCount}</span>
                <button type="button" class="btn-remove" onclick="removeVehicleEntry(${vehicleCount})">
                    Remove
                </button>
            </div>

            <div class="vehicle-form-grid">
                <div class="form-group">
                    <label for="vehicleNumber_${vehicleCount}">Vehicle Number/License Plate *</label>
                    <input 
                        type="text" 
                        id="vehicleNumber_${vehicleCount}" 
                        name="vehicleNumber_${vehicleCount}" 
                        class="vehicle-number"
                        placeholder="e.g., ABC-1234"
                        required
                    >
                    <span class="error-message"></span>
                </div>

                <div class="form-group">
                    <label for="vehicleMake_${vehicleCount}">Make *</label>
                    <input 
                        type="text" 
                        id="vehicleMake_${vehicleCount}" 
                        name="vehicleMake_${vehicleCount}" 
                        class="vehicle-make"
                        placeholder="e.g., Toyota"
                        required
                    >
                    <span class="error-message"></span>
                </div>

                <div class="form-group">
                    <label for="vehicleModel_${vehicleCount}">Model *</label>
                    <input 
                        type="text" 
                        id="vehicleModel_${vehicleCount}" 
                        name="vehicleModel_${vehicleCount}" 
                        class="vehicle-model"
                        placeholder="e.g., Camry"
                        required
                    >
                    <span class="error-message"></span>
                </div>

                <div class="form-group">
                    <label for="manufacturingYear_${vehicleCount}">Manufacturing Year *</label>
                    <input 
                        type="number" 
                        id="manufacturingYear_${vehicleCount}" 
                        name="manufacturingYear_${vehicleCount}" 
                        class="manufacturing-year"
                        min="1900" 
                        max="${new Date().getFullYear()}"
                        placeholder="e.g., 2020"
                        required
                    >
                    <span class="error-message"></span>
                </div>

                <div class="form-group">
                    <label for="vehicleType_${vehicleCount}">Vehicle Type</label>
                    <select id="vehicleType_${vehicleCount}" name="vehicleType_${vehicleCount}" class="vehicle-type">
                        <option value="">Select Type (Optional)</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Coupe">Coupe</option>
                        <option value="Truck">Truck</option>
                        <option value="Van">Van</option>
                        <option value="Wagon">Wagon</option>
                        <option value="Other">Other</option>
                    </select>
                    <span class="error-message"></span>
                </div>

                <div class="form-group">
                    <label for="color_${vehicleCount}">Color</label>
                    <input 
                        type="text" 
                        id="color_${vehicleCount}" 
                        name="color_${vehicleCount}" 
                        class="color"
                        placeholder="e.g., Silver"
                    >
                    <span class="error-message"></span>
                </div>
            </div>
        </div>
    `;

    vehiclesContainer.insertAdjacentHTML('beforeend', vehicleHTML);
}

/**
 * Remove a vehicle entry from the form
 */
function removeVehicleEntry(vehicleId) {
    const vehicleEntry = document.querySelector(`[data-vehicle-id="${vehicleId}"]`);
    if (vehicleEntry) {
        // Prevent removing all vehicles
        const vehicleCount = document.querySelectorAll('.vehicle-entry').length;
        if (vehicleCount <= 1) {
            showAlert('At least one vehicle must be registered.', 'error');
            return;
        }
        vehicleEntry.remove();
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Show loading spinner
    showSpinner(true);

    // Gather form data
    const formData = gatherFormData();

    try {
        // Send request to backend API
        const response = await fetch(`${API_BASE_URL}/customers/register-with-vehicles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        showSpinner(false);

        if (response.ok) {
            const data = await response.json();
            showAlert(`Customer "${data.firstName} ${data.lastName}" registered successfully!`, 'success');
            document.getElementById('customerRegistrationForm').reset();
            vehicleCount = 0;
            document.getElementById('vehiclesContainer').innerHTML = '';
            addVehicleEntry();
        } else if (response.status === 409) {
            showAlert('A customer with this email already exists.', 'error');
        } else {
            const errorData = await response.json();
            showAlert(`Error: ${errorData.message || 'Failed to register customer'}`, 'error');
        }
    } catch (error) {
        showSpinner(false);
        console.error('Error:', error);
        showAlert(`Error: ${error.message}`, 'error');
    }
}

/**
 * Gather form data and structure it according to API requirements
 */
function gatherFormData() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim() || null;

    const vehicles = [];
    document.querySelectorAll('.vehicle-entry').forEach((entry) => {
        const vehicleId = entry.getAttribute('data-vehicle-id');
        const vehicle = {
            vehicleNumber: document.getElementById(`vehicleNumber_${vehicleId}`).value.trim(),
            vehicleMake: document.getElementById(`vehicleMake_${vehicleId}`).value.trim(),
            vehicleModel: document.getElementById(`vehicleModel_${vehicleId}`).value.trim(),
            manufacturingYear: parseInt(document.getElementById(`manufacturingYear_${vehicleId}`).value),
            vehicleType: document.getElementById(`vehicleType_${vehicleId}`).value || null,
            color: document.getElementById(`color_${vehicleId}`).value.trim() || null
        };
        vehicles.push(vehicle);
    });

    return {
        firstName,
        lastName,
        email,
        phone,
        vehicles
    };
}

/**
 * Validate the entire form
 */
function validateForm() {
    let isValid = true;

    // Clear previous error messages
    document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('input, select').forEach(el => el.classList.remove('error'));

    // Validate customer details
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!firstName) {
        showFieldError('firstName', 'First name is required');
        isValid = false;
    }

    if (!lastName) {
        showFieldError('lastName', 'Last name is required');
        isValid = false;
    }

    if (!email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!isValidEmail(email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }

    // Validate vehicles
    document.querySelectorAll('.vehicle-entry').forEach((entry) => {
        const vehicleId = entry.getAttribute('data-vehicle-id');
        const vehicleNumber = document.getElementById(`vehicleNumber_${vehicleId}`).value.trim();
        const vehicleMake = document.getElementById(`vehicleMake_${vehicleId}`).value.trim();
        const vehicleModel = document.getElementById(`vehicleModel_${vehicleId}`).value.trim();
        const manufacturingYear = document.getElementById(`manufacturingYear_${vehicleId}`).value;

        if (!vehicleNumber) {
            showFieldError(`vehicleNumber_${vehicleId}`, 'Vehicle number is required');
            isValid = false;
        }

        if (!vehicleMake) {
            showFieldError(`vehicleMake_${vehicleId}`, 'Make is required');
            isValid = false;
        }

        if (!vehicleModel) {
            showFieldError(`vehicleModel_${vehicleId}`, 'Model is required');
            isValid = false;
        }

        if (!manufacturingYear) {
            showFieldError(`manufacturingYear_${vehicleId}`, 'Manufacturing year is required');
            isValid = false;
        } else if (manufacturingYear < 1900 || manufacturingYear > new Date().getFullYear()) {
            showFieldError(`manufacturingYear_${vehicleId}`, 'Please enter a valid year');
            isValid = false;
        }
    });

    return isValid;
}

/**
 * Show error message for a specific field
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('error');
        const errorElement = field.parentElement.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    const alertElement = document.getElementById('messageAlert');
    alertElement.textContent = message;
    alertElement.className = `alert ${type}`;
    alertElement.scrollIntoView({ behavior: 'smooth' });

    // Auto hide after 5 seconds
    setTimeout(() => {
        alertElement.classList.add('hidden');
    }, 5000);
}

/**
 * Show/hide loading spinner
 */
function showSpinner(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}
