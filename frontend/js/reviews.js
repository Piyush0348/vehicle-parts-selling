import RBAC from "./rbac.js";

const CONFIG = Object.freeze({
    API_BASE: "http://localhost:5033/api",
    REVIEWS_URL: "http://localhost:5033/api/reviews",
    CUSTOMER_REVIEWS: (id) => `http://localhost:5033/api/reviews/customer/${id}`
});

const dom = Object.freeze({
    customerIdInput: document.getElementById("customer-id-input"),
    loadBtn:         document.getElementById("load-btn"),
    openFormBtn:     document.getElementById("open-form-btn"),

    reviewsSection:  document.getElementById("all-reviews-section"),
    reviewsList:     document.getElementById("reviews-list"),
    noMsg:           document.getElementById("no-reviews-msg"),
    avgRating:       document.getElementById("avg-rating"),
    avgStars:        document.getElementById("avg-stars"),
    totalReviews:    document.getElementById("total-reviews"),

    formSection:     document.getElementById("form-section"),
    formHeading:     document.getElementById("form-heading"),
    form:            document.getElementById("review-form"),
    reviewId:        document.getElementById("review-id"),
    ratingValue:     document.getElementById("rating-value"),
    starBtns:        document.querySelectorAll(".star-btn"),
    commentInput:    document.getElementById("review-comment"),
    submitBtn:       document.getElementById("submit-btn"),
    cancelBtn:       document.getElementById("cancel-btn"),

    confirmDialog:   document.getElementById("confirm-dialog"),
    confirmYes:      document.getElementById("confirm-yes"),
    confirmNo:       document.getElementById("confirm-no"),

    errorMsg:        document.getElementById("error-msg")
});

const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const starsHtml = (rating) =>
    Array.from({ length: 5 })
        .map((_, i) => i < rating ? "&#9733;" : "&#9734;")
        .reduce((html, star) => html + star, "");

const createFetcher = (method) => async (url, body = null) => {
    const token = RBAC.getToken();
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": "Bearer " + token } : {})
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

const fetchGet    = createFetcher("GET");
const fetchPost   = createFetcher("POST");
const fetchPut    = createFetcher("PUT");
const fetchDelete = createFetcher("DELETE");

const api = Object.freeze({
    getAll:        () => fetchGet(CONFIG.REVIEWS_URL),
    getByCustomer: (id) => fetchGet(CONFIG.CUSTOMER_REVIEWS(id)),
    getById:       (id) => fetchGet(`${CONFIG.REVIEWS_URL}/${id}`),
    create:        (data) => fetchPost(CONFIG.REVIEWS_URL, data),
    update:        (id, data) => fetchPut(`${CONFIG.REVIEWS_URL}/${id}`, data),
    remove:        (id) => fetchDelete(`${CONFIG.REVIEWS_URL}/${id}`)
});

let currentCustomerId = null;
let deleteTargetId = null;

const showError = (msg) => {
    dom.errorMsg.textContent = msg;
    dom.errorMsg.style.display = "block";
};

const clearError = () => {
    dom.errorMsg.textContent = "";
    dom.errorMsg.style.display = "none";
};

const getCustomerId = () => {
    const raw = dom.customerIdInput.value.trim();
    if (!raw || isNaN(Number(raw)) || Number(raw) < 1) return null;
    return parseInt(raw, 10);
};

const setStarRating = (value) => {
    dom.ratingValue.value = value;
    dom.starBtns.forEach((btn) => {
        const btnValue = parseInt(btn.dataset.value, 10);
        btn.classList.toggle("active", btnValue <= value);
    });
};

const reviewToCardHtml = (review) => {
    const isOwner = currentCustomerId !== null && review.customerId === currentCustomerId;

    const actions = isOwner
        ? `<div class="review-actions">
               <button class="edit-btn" data-id="${review.id}">Edit</button>
               <button class="delete-btn" data-id="${review.id}">Delete</button>
           </div>`
        : "";

    return `<div class="review-card">
        <div class="review-card-header">
            <span class="review-author">${review.customerName}</span>
            <span class="review-date">${formatDate(review.createdAt)}</span>
        </div>
        <div class="review-stars">${starsHtml(review.rating)}</div>
        <p class="review-comment">${review.comment ?? "No comment provided."}</p>
        ${actions}
    </div>`;
};

const renderSummary = (reviews) => {
    const count = reviews.length;
    dom.totalReviews.textContent = `${count} review${count !== 1 ? "s" : ""}`;

    if (count === 0) {
        dom.avgRating.textContent = "0.0";
        dom.avgStars.innerHTML = starsHtml(0);
        return;
    }

    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / count;
    dom.avgRating.textContent = avg.toFixed(1);
    dom.avgStars.innerHTML = starsHtml(Math.round(avg));
};

const renderReviews = (reviews) => {
    renderSummary(reviews);

    if (reviews.length === 0) {
        dom.reviewsList.innerHTML = "";
        dom.noMsg.style.display = "block";
        return;
    }

    dom.noMsg.style.display = "none";
    dom.reviewsList.innerHTML = reviews
        .map(reviewToCardHtml)
        .reduce((html, card) => html + card, "");
};

const loadReviews = async () => {
    clearError();
    const customerId = getCustomerId();
    currentCustomerId = customerId;

    dom.loadBtn.disabled = true;
    dom.loadBtn.textContent = "Loading…";

    try {
        const allReviews = await api.getAll();
        renderReviews(allReviews);
    } catch (err) {
        showError(`Could not load reviews: ${err.message}`);
    } finally {
        dom.loadBtn.disabled = false;
        dom.loadBtn.textContent = "Load";
    }
};

const showForm = (heading, submitLabel) => {
    dom.formHeading.textContent = heading;
    dom.submitBtn.textContent = submitLabel;
    dom.formSection.style.display = "block";
    dom.reviewsSection.style.display = "none";
};

const hideForm = () => {
    dom.form.reset();
    dom.reviewId.value = "";
    setStarRating(0);
    dom.formSection.style.display = "none";
    dom.reviewsSection.style.display = "block";
};

const openCreateForm = () => {
    if (!currentCustomerId) {
        showError("Please enter your Customer ID and click Load first.");
        return;
    }
    hideForm();
    showForm("Write a Review", "Submit Review");
};

const openEditForm = async (id) => {
    try {
        const review = await api.getById(id);

        if (review.customerId !== currentCustomerId) {
            showError("You can only edit your own reviews.");
            return;
        }

        dom.reviewId.value = review.id;
        setStarRating(review.rating);
        dom.commentInput.value = review.comment ?? "";

        showForm("Edit Your Review", "Update Review");
    } catch (err) {
        showError(`Could not load review: ${err.message}`);
    }
};

const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const rating = parseInt(dom.ratingValue.value, 10);
    if (rating < 1 || rating > 5) {
        showError("Please select a rating between 1 and 5.");
        return;
    }

    const editId = dom.reviewId.value;
    const isEdit = editId !== "";

    try {
        if (isEdit) {
            await api.update(parseInt(editId, 10), {
                rating: rating,
                comment: dom.commentInput.value || null
            });
        } else {
            await api.create({
                rating: rating,
                comment: dom.commentInput.value || null,
                customerId: currentCustomerId
            });
        }

        hideForm();
        await loadReviews();
    } catch (err) {
        showError(`Could not save review: ${err.message}`);
    }
};

const confirmDelete = (id) => {
    deleteTargetId = id;
    dom.confirmDialog.showModal();
};

const handleConfirmYes = async () => {
    dom.confirmDialog.close();
    if (!deleteTargetId) return;

    try {
        await api.remove(deleteTargetId);
        deleteTargetId = null;
        await loadReviews();
    } catch (err) {
        showError(`Could not delete review: ${err.message}`);
    }
};

const handleReviewsClick = (event) => {
    const editBtn = event.target.closest(".edit-btn");
    if (editBtn) {
        openEditForm(parseInt(editBtn.dataset.id, 10));
        return;
    }

    const deleteBtn = event.target.closest(".delete-btn");
    if (deleteBtn) {
        confirmDelete(parseInt(deleteBtn.dataset.id, 10));
    }
};

const bindEvents = () => {
    dom.loadBtn.addEventListener("click", loadReviews);
    dom.customerIdInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") loadReviews();
    });
    dom.openFormBtn.addEventListener("click", openCreateForm);
    dom.cancelBtn.addEventListener("click", hideForm);
    dom.form.addEventListener("submit", handleSubmit);
    dom.reviewsList.addEventListener("click", handleReviewsClick);
    dom.confirmYes.addEventListener("click", handleConfirmYes);
    dom.confirmNo.addEventListener("click", () => dom.confirmDialog.close());

    dom.starBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            setStarRating(parseInt(btn.dataset.value, 10));
        });
    });
};

const init = () => {
    bindEvents();

    const userId = Number(RBAC.getUserId());
    const role = RBAC.getUserRole();

    if (Number.isInteger(userId) && userId > 0 && role === "Customer") {
        dom.customerIdInput.value = String(userId);
        dom.customerIdInput.readOnly = true;
        dom.customerIdInput.placeholder = "Signed-in customer";
    }

    api.getAll().then(renderReviews).catch(() => {});
};

init();