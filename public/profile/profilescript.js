const token = localStorage.getItem("token");
let currentUser = JSON.parse(localStorage.getItem("currentUser"));

const pageAlert = document.getElementById("pageAlert");
const passwordAlert = document.getElementById("passwordAlert");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const bookingsSection = document.getElementById("profileBookingsSection");
const bookingsDiv = document.getElementById("profileBookings");
const bookingsCount = document.getElementById("profileBookingsCount");

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

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function renderProfile(user) {
  const initial = (user.name || user.email || "E").trim().charAt(0).toUpperCase();

  document.getElementById("profileAvatar").textContent = initial;
  document.getElementById("profileName").textContent = user.name || "Eventify User";
  document.getElementById("detailName").textContent = user.name || "-";
  document.getElementById("detailEmail").textContent = user.email || "-";
  document.getElementById("detailPhone").textContent = user.phone || "-";
  document.getElementById("detailAge").textContent = user.age || "-";
  document.getElementById("detailGender").textContent = user.gender || "-";

 if (bookingsSection) {
  bookingsSection.style.display = currentUser?.isAdmin === true ? "none" : "block";
}
}

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
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
      </svg>
      <p>No bookings yet. Book an event from your dashboard and it will appear here.</p>
    </div>`;
}

async function loadBookings() {
  if (!bookingsDiv || currentUser?.isAdmin) return;

  renderBookingsSkeleton();

  try {
    const bookings = await apiFetch("/api/bookings");

    if (bookingsCount) {
      bookingsCount.textContent = `${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`;
    }

    if (!bookings.length) {
      renderEmptyBookings();
      return;
    }

    bookingsDiv.innerHTML = bookings.map(booking => `
      <div class="col-lg-6 d-flex">
        <article class="profile-ticket-card w-100">
          <div class="ticket-top">
            <div class="ticket-label">Eventify Ticket</div>
            <h3>${escapeHtml(booking.event)}</h3>
            <div class="ticket-meta">

  <span>
    Booking #${String(booking._id).slice(-6).toUpperCase()}
  </span>

  <span>
    Tickets:
    <strong>${booking.tickets}</strong>
  </span>

  <span>
    Payment:
    <strong>
      ${escapeHtml(booking.paymentMethod || "-").toUpperCase()}
    </strong>
  </span>

  <span>
    Status:
    <strong>
      ${escapeHtml(booking.paymentStatus || "-").toUpperCase()}
    </strong>
  </span>

  <span>
    Amount:
    <strong>
      ${Number(booking.amount || 0).toLocaleString()} EGP
    </strong>
  </span>

</div>
          </div>
          <div class="ticket-bottom">
            <span class="ticket-status">Confirmed</span>
            <button class="profile-btn-cancel" data-booking-id="${booking._id}" data-event-id="${booking.eventId}">
              Cancel
            </button>
          </div>
        </article>
      </div>
    `).join("");
  } catch (e) {
    bookingsDiv.innerHTML = "";
    showAlert(pageAlert, e.message || "Could not load your bookings.");
  }
}

async function cancelBooking(bookingId) {
  try {
    await apiFetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
    await loadBookings();
    showAlert(pageAlert, "Booking cancelled successfully.", "success");
  } catch (e) { 
    showAlert(pageAlert, e.message || "Could not cancel booking.");
  }
}

async function loadProfile() {
  if (!token || !currentUser) {
    window.location.href = "../login/login.html";
    return;
  }

  try {
    const user = await apiFetch("/api/users/me/profile");
    currentUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      gender: user.gender,
      isAdmin: user.isAdmin,
    };
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    renderProfile(currentUser);
    await loadBookings();
  } catch (e) {
    showAlert(pageAlert, e.message || "Could not load your profile.");
  }
}

function validatePasswordForm(currentPassword, newPassword, confirmPassword) {
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return "Please fill in all password fields.";
  }

  if (!passwordPattern.test(newPassword)) {
    return "New password must be at least 8 characters and include uppercase, lowercase, and a number.";
  }

  if (newPassword !== confirmPassword) {
    return "New password and confirmation do not match.";
  }

  if (currentPassword === newPassword) {
    return "New password must be different from your current password.";
  }

  return "";
}

async function changePassword() {
  const currentPassword = document.getElementById("currentPassword").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();
  const validationError = validatePasswordForm(currentPassword, newPassword, confirmPassword);

  hideAlert(passwordAlert);

  if (validationError) {
    showAlert(passwordAlert, validationError);
    return;
  }

  changePasswordBtn.disabled = true;
  changePasswordBtn.textContent = "Updating...";

  try {
    const data = await apiFetch("/api/users/me/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    showAlert(passwordAlert, data.message || "Password changed successfully.", "success");
  } catch (e) {
    showAlert(passwordAlert, e.message || "Could not change password.");
  } finally {
    changePasswordBtn.disabled = false;
    changePasswordBtn.textContent = "Update Password";
  }
}

document.getElementById("logoutBtn").addEventListener("click", logout);
changePasswordBtn.addEventListener("click", changePassword);

if (bookingsDiv) {
  bookingsDiv.addEventListener("click", e => {
    const cancelBtn = e.target.closest(".profile-btn-cancel");
    if (!cancelBtn) return;

    cancelBtn.disabled = true;
    cancelBtn.textContent = "Cancelling...";
    cancelBooking(cancelBtn.dataset.bookingId, cancelBtn.dataset.eventId);
  });
}

document.addEventListener("keydown", e => {
  if (e.key === "Enter") changePassword();
});

loadProfile();
