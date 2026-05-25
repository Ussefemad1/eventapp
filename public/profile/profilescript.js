let token = localStorage.getItem("token");
let currentUser = JSON.parse(localStorage.getItem("currentUser"));

const pageAlert        = document.getElementById("pageAlert");
const profileEditAlert = document.getElementById("profileEditAlert");
const passwordAlert    = document.getElementById("passwordAlert");
const updateProfileBtn = document.getElementById("updateProfileBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const bookingsSection  = document.getElementById("profileBookingsSection");
const bookingsDiv      = document.getElementById("profileBookings");
const bookingsCount    = document.getElementById("profileBookingsCount");

/* ── Helpers ── */
function showAlert(element, message, type = "danger") {
  element.className = `alert alert-${type}`;
  element.textContent = message;
  element.classList.remove("d-none");
}

function hideAlert(element) {
  element.classList.add("d-none");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  window.location.href = "../login/login.html";
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || "Request failed");

  return data;
}

/* ── Render profile card (left side) ── */
function renderProfile(user) {
  const initial = (user.name || user.email || "E").trim().charAt(0).toUpperCase();

  document.getElementById("profileAvatar").textContent = initial;
  document.getElementById("profileName").textContent   = user.name || "Eventify User";
  document.getElementById("detailName").textContent    = user.name   || "-";
  document.getElementById("detailEmail").textContent   = user.email  || "-";
  document.getElementById("detailPhone").textContent   = user.phone  || "-";
  document.getElementById("detailAge").textContent     = user.age    || "-";
  document.getElementById("detailGender").textContent  = user.gender || "-";

  /* hide bookings section for admins */
  if (bookingsSection) {
    bookingsSection.style.display = currentUser?.isAdmin === true ? "none" : "block";
  }
}

/* ── Update Profile ── */
async function updateProfile() {
  hideAlert(profileEditAlert);

  const body = {
    name:   document.getElementById("editName").value.trim(),
    email:  document.getElementById("editEmail").value.trim(),
    phone:  document.getElementById("editPhone").value.trim(),
    gender: document.getElementById("editGender").value.trim(),
  };

  const ageVal = document.getElementById("editAge").value;
  if (ageVal) body.age = Number(ageVal);

  /* strip undefined / empty */
  Object.keys(body).forEach(k => (body[k] === undefined || body[k] === "") && delete body[k]);

  updateProfileBtn.disabled    = true;
  updateProfileBtn.textContent = "Saving…";

  try {
    const user = await apiFetch("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(body),
    });

    currentUser = {
      id:      user.id,
      name:    user.name,
      email:   user.email,
      phone:   user.phone,
      age:     user.age,
      gender:  user.gender,
      isAdmin: user.isAdmin,
    };

    if (user.token) {
      token = user.token;
      localStorage.setItem("token", user.token);
    }

    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    renderProfile(currentUser);

    /* pre-fill edit form again */
    fillEditForm(currentUser);

    showAlert(profileEditAlert, "Profile updated successfully.", "success");
  } catch (e) {
    showAlert(profileEditAlert, e.message || "Could not update profile.");
  } finally {
    updateProfileBtn.disabled    = false;
    updateProfileBtn.textContent = "Save Profile";
  }
}

/* ── Fill the edit form fields ── */
function fillEditForm(user) {
  document.getElementById("editName").value   = user.name   || "";
  document.getElementById("editEmail").value  = user.email  || "";
  document.getElementById("editPhone").value  = user.phone  || "";
  document.getElementById("editAge").value    = user.age    || "";
  document.getElementById("editGender").value = user.gender || "";
}

/* ── Bookings skeleton ── */
function renderBookingsSkeleton() {
  bookingsDiv.innerHTML = Array.from({ length: 2 }, () => `
    <div class="col-lg-6">
      <div class="profile-ticket-card profile-ticket-skeleton">
        <div class="profile-skeleton-line w-50"></div>
        <div class="profile-skeleton-line w-75"></div>
        <div class="profile-skeleton-line w-25"></div>
      </div>
    </div>
  `).join("");
}

function renderEmptyBookings() {
  bookingsDiv.innerHTML = `
    <div class="profile-empty">
      <svg width="46" height="46" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
      </svg>
      <p>No bookings yet. Book an event from your dashboard and it will appear here.</p>
    </div>`;
}

/* ── Load bookings ── */
async function loadBookings() {
  if (!bookingsDiv || currentUser?.isAdmin) return;

  renderBookingsSkeleton();

  try {
    const bookings = await apiFetch("/api/bookings");

    if (bookingsCount) {
      bookingsCount.textContent = `${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`;
    }

    if (!bookings.length) { renderEmptyBookings(); return; }

    bookingsDiv.innerHTML = bookings.map(booking => `
      <div class="col-lg-6 d-flex">
        <article class="profile-ticket-card w-100">
          <div class="ticket-top">
            <div class="ticket-label">Eventify Ticket</div>
            <h3>${escapeHtml(booking.event)}</h3>
            <div class="ticket-meta">
              <span>Booking #${String(booking._id).slice(-6).toUpperCase()}</span>
              <span>Tickets: <strong>${booking.tickets}</strong></span>
              <span>Payment: <strong>${escapeHtml(booking.paymentMethod || "-").toUpperCase()}</strong></span>
              <span>Status: <strong>${escapeHtml(booking.paymentStatus || "-").toUpperCase()}</strong></span>
              <span>Booking: <strong>${escapeHtml(booking.bookingStatus || "active").toUpperCase()}</strong></span>
              <span>Amount: <strong>${Number(booking.amount || 0).toLocaleString()} EGP</strong></span>
            </div>
          </div>
          <div class="ticket-bottom">
            <span class="ticket-status ${booking.bookingStatus === "cancelled" ? "ticket-status-cancelled" : ""}">
              ${escapeHtml(booking.bookingStatus || "active")}
            </span>
            <button
              class="profile-btn-cancel"
              data-booking-id="${booking._id}"
              ${booking.bookingStatus === "cancelled" ? "disabled" : ""}
            >Cancel</button>
          </div>
        </article>
      </div>
    `).join("");
  } catch (e) {
    bookingsDiv.innerHTML = "";
    showAlert(pageAlert, e.message || "Could not load your bookings.");
  }
}

/* ── Cancel booking ── */
async function cancelBooking(bookingId) {
  try {
    await apiFetch(`/api/bookings/${bookingId}/cancel`, { method: "PUT" });
    await loadBookings();
    showAlert(pageAlert, "Booking cancelled successfully.", "success");
  } catch (e) {
    showAlert(pageAlert, e.message || "Could not cancel booking.");
  }
}

/* ── Password validation ── */
function validatePasswordForm(currentPassword, newPassword, confirmPassword) {
  const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!currentPassword || !newPassword || !confirmPassword) return "Please fill in all password fields.";

  if (!pattern.test(newPassword)) {
    return "New password must be at least 8 characters and include uppercase, lowercase, and a number.";
  }

  if (newPassword !== confirmPassword) return "New password and confirmation do not match.";

  if (currentPassword === newPassword) return "New password must be different from your current password.";

  return "";
}

/* ── Change password ── */
async function changePassword() {
  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword     = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();
  const validationError = validatePasswordForm(currentPassword, newPassword, confirmPassword);

  hideAlert(passwordAlert);

  if (validationError) { showAlert(passwordAlert, validationError); return; }

  changePasswordBtn.disabled    = true;
  changePasswordBtn.textContent = "Updating…";

  try {
    const data = await apiFetch("/api/users/me/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value     = "";
    document.getElementById("confirmPassword").value = "";
    showAlert(passwordAlert, data.message || "Password changed successfully.", "success");
  } catch (e) {
    showAlert(passwordAlert, e.message || "Could not change password.");
  } finally {
    changePasswordBtn.disabled    = false;
    changePasswordBtn.textContent = "Update Password";
  }
}

/* ── Load profile on page init ── */
async function loadProfile() {
  if (!token || !currentUser) {
    window.location.href = "../login/login.html";
    return;
  }

  try {
    const user = await apiFetch("/api/users/me/profile");

    currentUser = {
      id:      user._id,
      name:    user.name,
      email:   user.email,
      phone:   user.phone,
      age:     user.age,
      gender:  user.gender,
      isAdmin: user.isAdmin,
    };

    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    renderProfile(currentUser);
    fillEditForm(currentUser);
    await loadBookings();
  } catch (e) {
    showAlert(pageAlert, e.message || "Could not load your profile.");
  }
}

/* ── Event listeners ── */
document.getElementById("logoutBtn").addEventListener("click", logout);
updateProfileBtn.addEventListener("click", updateProfile);
changePasswordBtn.addEventListener("click", changePassword);

if (bookingsDiv) {
  bookingsDiv.addEventListener("click", e => {
    const btn = e.target.closest(".profile-btn-cancel");
    if (!btn) return;
    btn.disabled    = true;
    btn.textContent = "Cancelling…";
    cancelBooking(btn.dataset.bookingId);
  });
}

document.addEventListener("keydown", e => {
  if (e.key === "Enter") changePassword();
});

/* ── Edit-profile panel toggle ── */
const editToggleBtn   = document.getElementById("editProfileToggleBtn");
const editPanelWrap   = document.getElementById("editProfilePanel");

if (editToggleBtn && editPanelWrap) {
  editToggleBtn.addEventListener("click", () => {
    const isHidden = editPanelWrap.style.display === "none" || editPanelWrap.style.display === "";
    editPanelWrap.style.display = isHidden ? "block" : "none";
    editToggleBtn.textContent   = isHidden ? "Cancel Edit" : "Edit Profile";
    if (isHidden) editPanelWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

loadProfile();