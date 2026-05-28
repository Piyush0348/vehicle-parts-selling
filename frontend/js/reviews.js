import RBAC from "./rbac.js";

const CONFIG = Object.freeze({
    REVIEWS_URL:      "http://localhost:5033/api/reviews",
    CUSTOMER_REVIEWS: (id) =>
        `http://localhost:5033/api/reviews/customer/${id}`
});

const dom = Object.freeze({
    openFormBtn:   document.getElementById("open-form-btn"),
    reviewsSection:document.getElementById("all-reviews-section"),
    reviewsList:   document.getElementById("reviews-list"),
    noMsg:         document.getElementById("no-reviews-msg"),
    avgRating:     document.getElementById("avg-rating"),
    avgStars:      document.getElementById("avg-stars"),
    totalReviews:  document.getElementById("total-reviews"),
    formSection:   document.getElementById("form-section"),
    formHeading:   document.getElementById("form-heading"),
    form:          document.getElementById("review-form"),
    reviewId:      document.getElementById("review-id"),
    ratingValue:   document.getElementById("rating-value"),
    starBtns:      document.querySelectorAll(".star-btn"),
    commentInput:  document.getElementById("review-comment"),
    submitBtn:     document.getElementById("submit-btn"),
    cancelBtn:     document.getElementById("cancel-btn"),
    confirmDialog: document.getElementById("confirm-dialog"),
    confirmYes:    document.getElementById("confirm-yes"),
    confirmNo:     document.getElementById("confirm-no"),
    errorMsg:      document.getElementById("error-msg")
});

let currentCustomerId = null;
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

function starsHtml(rating) {
    return Array.from({ length: 5 })
        .map((_, i) => i < rating ? "&#9733;" : "&#9734;")
        .join("");
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

function setStarRating(value) {
    dom.ratingValue.value = value;
    dom.starBtns.forEach(btn => {
        btn.classList.toggle(
            "active",
            parseInt(btn.dataset.value, 10) <= value
        );
    });
}

function reviewToCard(review) {
    const isOwner = currentCustomerId !== null &&
                    review.customerId === currentCustomerId;

    const actions = isOwner
        ? `<div class="review-actions">
               <button class="edit-btn"
                       data-id="${review.id}">Edit</button>
               <button class="delete-btn"
                       data-id="${review.id}">Delete</button>
           </div>`
        : "";

    return `<div class="review-card">
        <div class="review-card-header">
            <span class="review-author">${review.customerName}</span>
            <span class="review-date">
                ${formatDate(review.createdAt)}
            </span>
        </div>
        <div class="review-stars">${starsHtml(review.rating)}</div>
        <p class="review-comment">
            ${review.comment || "No comment provided."}
        </p>
        ${actions}
    </div>`;
}

function renderSummary(reviews) {
    const count = reviews.length;
    dom.totalReviews.textContent =
        `${count} review${count !== 1 ? "s" : ""}`;

    if (count === 0) {
        dom.avgRating.textContent = "0.0";
        dom.avgStars.innerHTML    = starsHtml(0);
        return;
    }

    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / count;
    dom.avgRating.textContent = avg.toFixed(1);
    dom.avgStars.innerHTML    = starsHtml(Math.round(avg));
}

function renderReviews(reviews) {
    renderSummary(reviews);
    if (reviews.length === 0) {
        dom.reviewsList.innerHTML = "";
        dom.noMsg.style.display   = "block";
        return;
    }
    dom.noMsg.style.display   = "none";
    dom.reviewsList.innerHTML = reviews.map(reviewToCard).join("");
}

function loadReviews() {
    clearError();
    fetch(CONFIG.REVIEWS_URL, { headers: getAuthHeaders() })
        .then(res => {
            if (!res.ok) throw new Error("Failed to load reviews.");
            return res.json();
        })
        .then(renderReviews)
        .catch(err => showError(err.message));
}

function showForm(heading, submitLabel) {
    dom.formHeading.textContent    = heading;
    dom.submitBtn.textContent      = submitLabel;
    dom.formSection.style.display  = "block";
    dom.reviewsSection.style.display = "none";
}

function hideForm() {
    dom.form.reset();
    dom.reviewId.value               = "";
    setStarRating(0);
    dom.formSection.style.display    = "none";
    dom.reviewsSection.style.display = "block";
}

function openCreateForm() {
    if (!currentCustomerId) {
        showError("Please log in to write a review.");
        return;
    }
    hideForm();
    showForm("Write a Review", "Submit Review");
}

function openEditForm(id) {
    fetch(`${CONFIG.REVIEWS_URL}/${id}`, { headers: getAuthHeaders() })
        .then(res => {
            if (!res.ok) throw new Error("Review not found.");
            return res.json();
        })
        .then(review => {
            if (review.customerId !== currentCustomerId) {
                showError("You can only edit your own reviews.");
                return;
            }
            dom.reviewId.value    = review.id;
            setStarRating(review.rating);
            dom.commentInput.value = review.comment || "";
            showForm("Edit Your Review", "Update Review");
        })
        .catch(err => showError(err.message));
}

function handleSubmit(e) {
    e.preventDefault();
    clearError();

    const rating = parseInt(dom.ratingValue.value, 10);
    if (rating < 1 || rating > 5) {
        showError("Please select a rating between 1 and 5.");
        return;
    }

    const editId = dom.reviewId.value;
    const isEdit = editId !== "";
    const url    = isEdit
        ? `${CONFIG.REVIEWS_URL}/${editId}`
        : CONFIG.REVIEWS_URL;
    const method = isEdit ? "PUT" : "POST";
    const body   = isEdit
        ? {
            rating:  rating,
            comment: dom.commentInput.value.trim() || null
          }
        : {
            rating:     rating,
            comment:    dom.commentInput.value.trim() || null,
            customerId: currentCustomerId
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
        loadReviews();
    })
    .catch(err => showError(err.message))
    .finally(() => {
        dom.submitBtn.disabled    = false;
        dom.submitBtn.textContent = isEdit
            ? "Update Review"
            : "Submit Review";
    });
}

function confirmDelete(id) {
    deleteTargetId = id;
    dom.confirmDialog.showModal();
}

function handleConfirmYes() {
    dom.confirmDialog.close();
    if (!deleteTargetId) return;

    fetch(`${CONFIG.REVIEWS_URL}/${deleteTargetId}`, {
        method:  "DELETE",
        headers: getAuthHeaders()
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to delete review.");
        deleteTargetId = null;
        loadReviews();
    })
    .catch(err => showError(err.message));
}

function handleReviewsClick(e) {
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
        openEditForm(parseInt(editBtn.dataset.id, 10));
        return;
    }
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
        confirmDelete(parseInt(deleteBtn.dataset.id, 10));
    }
}

function init() {
    const customerIdInput = document.getElementById("customer-id-input");
    const loadBtn         = document.getElementById("load-btn");
    if (customerIdInput) customerIdInput.remove();
    if (loadBtn)         loadBtn.remove();

    currentCustomerId = getLoggedInCustomerId();

    if (!currentCustomerId) {
        dom.openFormBtn.style.display = "none";
    }

    dom.openFormBtn.addEventListener("click",    openCreateForm);
    dom.cancelBtn.addEventListener("click",      hideForm);
    dom.form.addEventListener("submit",          handleSubmit);
    dom.reviewsList.addEventListener("click",    handleReviewsClick);
    dom.confirmYes.addEventListener("click",     handleConfirmYes);
    dom.confirmNo.addEventListener("click",      () => dom.confirmDialog.close());

    dom.starBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            setStarRating(parseInt(btn.dataset.value, 10));
        });
    });

    loadReviews();
}

init();