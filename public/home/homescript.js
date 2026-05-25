const userInfo    = document.getElementById("userInfo");
const adminPanel  = document.getElementById("adminPanel");
const eventsDiv   = document.getElementById("events");
const logoutBtn   = document.getElementById("logout");
const registerBtn = document.getElementById("registerBtn");
const loginBtn    = document.getElementById("loginBtn");
const profileBtn  = document.getElementById("profileBtn");
const filterName     = document.getElementById("filterName");
const filterCategory = document.getElementById("filterCategory");
const filterMinPrice = document.getElementById("filterMinPrice");
const filterMaxPrice = document.getElementById("filterMaxPrice");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

let currentUser = JSON.parse(localStorage.getItem("currentUser"));

const API = "/api";

const DEFAULT_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=900&q=80";

const CASH_PAYMENT_STORES = [
  { name: "Eventify Downtown",   area: "Tahrir Square",       mapsUrl: "https://www.google.com/maps/search/?api=1&query=Tahrir%20Square%20Cairo" },
  { name: "Eventify Nasr City",  area: "City Stars",          mapsUrl: "https://www.google.com/maps/search/?api=1&query=City%20Stars%20Nasr%20City%20Cairo" },
  { name: "Eventify Zamalek",    area: "26 July Street",      mapsUrl: "https://www.google.com/maps/search/?api=1&query=26%20July%20Street%20Zamalek%20Cairo" },
  { name: "Eventify Maadi",      area: "Road 9",              mapsUrl: "https://www.google.com/maps/search/?api=1&query=Road%209%20Maadi%20Cairo" },
  { name: "Eventify New Cairo",  area: "Cairo Festival City", mapsUrl: "https://www.google.com/maps/search/?api=1&query=Cairo%20Festival%20City%20New%20Cairo" },
  { name: "Eventify Heliopolis", area: "Korba",               mapsUrl: "https://www.google.com/maps/search/?api=1&query=Korba%20Heliopolis%20Cairo" },
];

/* ── Utilities ── */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isSafeHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}

function formatEventDate(value) {
  if (!value) return "Date TBA";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date TBA";
  return date.toLocaleString([], {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function getEventQueryString() {
  const params = new URLSearchParams();
  if (filterName?.value.trim())    params.set("name",     filterName.value.trim());
  if (filterCategory?.value)       params.set("category", filterCategory.value);
  if (filterMinPrice?.value !== "") params.set("minPrice", filterMinPrice.value);
  if (filterMaxPrice?.value !== "") params.set("maxPrice", filterMaxPrice.value);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API + path, { ...options, headers });

  if (!res.ok) throw new Error(await res.text());

  return res.json();
}

function goRegister() { window.location.href = "../register/register.html"; }
function goLogin()    { window.location.href = "../login/login.html"; }
function goProfile()  { window.location.href = "../profile/profile.html"; }

/* ── Toast helpers ── */
function getToastContainer() {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id        = "toastContainer";
    container.className = "toast-container position-fixed top-0 end-0 p-3";
    container.style.zIndex = "1080";
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = "success", title = "Eventify") {
  const toast     = document.createElement("div");
  const textClass = type === "success" ? "text-bg-success" : "text-bg-danger";

  toast.className = `toast align-items-stretch border-0 ${textClass}`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong class="d-block mb-1">${title}</strong>
        <span>${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;

  getToastContainer().appendChild(toast);
  const instance = new bootstrap.Toast(toast, { delay: 5000 });
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  instance.show();
}

function showCashPaymentToast() {
  const toast = document.createElement("div");
  toast.className = "toast align-items-stretch border-0 text-bg-success";
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  const storesHtml = CASH_PAYMENT_STORES.map(store => `
    <li>
      <a class="link-light fw-semibold" href="${store.mapsUrl}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(store.name)}
      </a>
      <span class="d-block small opacity-75">${escapeHtml(store.area)}</span>
    </li>
  `).join("");

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong class="d-block mb-1">Booking confirmed</strong>
        <span>Please pay at one of these Eventify stores within 24 hours:</span>
        <ol class="mb-0 mt-2 ps-3">${storesHtml}</ol>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 mt-2" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;

  getToastContainer().appendChild(toast);
  const instance = new bootstrap.Toast(toast, { autohide: false });
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  instance.show();
}

function showPaymentAlert(message, type = "danger") {
  const existing = document.getElementById("paymentAlert");
  if (existing) existing.remove();

  const alertBox     = document.createElement("div");
  alertBox.id        = "paymentAlert";
  alertBox.className = `alert alert-${type} py-2 mb-3`;
  alertBox.textContent = message;

  const modalBody = document.querySelector("#paymentModal .modal-body");
  if (modalBody) modalBody.prepend(alertBox);
}

function clearPaymentAlert() {
  const alertBox = document.getElementById("paymentAlert");
  if (alertBox) alertBox.remove();
}

/* ── Card helpers ── */
function onlyDigits(value)      { return value.replace(/\D/g, ""); }
function formatCardNumber(value){ return onlyDigits(value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); }
function formatExpiry(value) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidExpiry(value) {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year  = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

function setFieldState(field, isValid) {
  field.classList.toggle("is-invalid", !isValid);
  field.classList.toggle("is-valid",   isValid);
}

function clearCardValidation() {
  ["cardHolder", "cardNumber", "cardExpiry", "cardCVV"].forEach(id => {
    const field = document.getElementById(id);
    if (!field) return;
    field.classList.remove("is-invalid", "is-valid");
  });
}

function validateCardField(field, showState = true) {
  let isValid = false;
  const value = field.value.trim();

  if      (field.id === "cardHolder") isValid = /^[A-Za-z][A-Za-z\s'.-]{2,}$/.test(value) && value.trim().includes(" ");
  else if (field.id === "cardNumber") { const d = onlyDigits(value); isValid = d.length >= 13 && d.length <= 16; }
  else if (field.id === "cardExpiry") isValid = isValidExpiry(value);
  else if (field.id === "cardCVV")    isValid = /^\d{3,4}$/.test(value);

  if (showState) setFieldState(field, isValid);
  return isValid;
}

function validateCardDetails() {
  const fields        = ["cardHolder", "cardNumber", "cardExpiry", "cardCVV"].map(id => document.getElementById(id));
  const invalidFields = fields.filter(f => !validateCardField(f));

  if (invalidFields.length) {
    invalidFields[0].focus();
    showPaymentAlert("Please fix the highlighted card details.");
    return false;
  }

  clearPaymentAlert();
  return true;
}

function setupCardInputValidation() {
  const holder = document.getElementById("cardHolder");
  const number = document.getElementById("cardNumber");
  const expiry = document.getElementById("cardExpiry");
  const cvv    = document.getElementById("cardCVV");

  holder.addEventListener("input", () => {
    holder.value = holder.value.replace(/[^A-Za-z\s'.-]/g, "").replace(/\s{2,}/g, " ");
    if (holder.value.trim()) validateCardField(holder);
    else holder.classList.remove("is-invalid", "is-valid");
  });

  number.addEventListener("input", () => {
    number.value = formatCardNumber(number.value);
    if (number.value.trim()) validateCardField(number);
    else number.classList.remove("is-invalid", "is-valid");
  });

  expiry.addEventListener("input", () => {
    expiry.value = formatExpiry(expiry.value);
    if (expiry.value.trim()) validateCardField(expiry);
    else expiry.classList.remove("is-invalid", "is-valid");
  });

  cvv.addEventListener("input", () => {
    cvv.value = onlyDigits(cvv.value).slice(0, 4);
    if (cvv.value.trim()) validateCardField(cvv);
    else cvv.classList.remove("is-invalid", "is-valid");
  });
}

function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  currentUser = null;
  updateUI();
}

/* ── Filters ── */
let filterTimer = null;
function scheduleEventSearch() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(renderEvents, 250);
}

function setupEventFilters() {
  [filterName, filterMinPrice, filterMaxPrice].forEach(field => {
    if (field) field.addEventListener("input", scheduleEventSearch);
  });

  if (filterCategory) filterCategory.addEventListener("change", renderEvents);

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      if (filterName)     filterName.value     = "";
      if (filterCategory) filterCategory.value = "";
      if (filterMinPrice) filterMinPrice.value = "";
      if (filterMaxPrice) filterMaxPrice.value = "";
      renderEvents();
    });
  }
}

/* ── Admin: Create / Edit Event ── */
let editingEventId = null;

function resetEventForm() {
  const ename      = document.getElementById("ename");
  const ecat       = document.getElementById("ecat");
  const evenue     = document.getElementById("evenue");
  const elocationUrl = document.getElementById("elocationUrl");
  const eseats     = document.getElementById("eseats");
  const eprice     = document.getElementById("eprice");
  const eimage     = document.getElementById("eimage");
  const estartDate = document.getElementById("estartDate");
  const estatus    = document.getElementById("estatus");
  const btn        = document.getElementById("createEventBtn");

  ename.value = ecat.value = evenue.value = elocationUrl.value = eseats.value = eprice.value = eimage.value = "";
  if (estartDate) estartDate.value = "";
  if (estatus)    estatus.value    = "upcoming";
  if (btn)        btn.textContent  = "Create Event";
  editingEventId = null;
}

async function editEvent(id) {
  try {
    const event = await apiFetch(`/events/${id}`);

    document.getElementById("ename").value      = event.name      || "";
    document.getElementById("ecat").value       = event.category  || "";
    document.getElementById("evenue").value     = event.venue     || "";
    document.getElementById("elocationUrl").value = event.locationUrl || "";
    document.getElementById("eseats").value     = event.seats     ?? "";
    document.getElementById("eprice").value     = event.price     ?? "";
    document.getElementById("estartDate").value = toDateTimeLocalValue(event.startDate);
    document.getElementById("estatus").value    = event.status    || "upcoming";

    editingEventId = event._id;
    const btn = document.getElementById("createEventBtn");
    if (btn) btn.textContent = "Save Event";

    document.getElementById("adminPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    showAdminMsg("Editing event. Choose a new image only if you want to replace the current one.", "success");
  } catch (e) {
    showAdminMsg("Could not load event for editing: " + e.message, "error");
  }
}

async function addEvent() {
  const ename      = document.getElementById("ename");
  const ecat       = document.getElementById("ecat");
  const evenue     = document.getElementById("evenue");
  const elocationUrl = document.getElementById("elocationUrl");
  const eseats     = document.getElementById("eseats");
  const eprice     = document.getElementById("eprice");
  const eimage     = document.getElementById("eimage");
  const estartDate = document.getElementById("estartDate");
  const estatus    = document.getElementById("estatus");

  /* Validate required fields (no available seats field anymore) */
  if (!ename.value || !ecat.value || !evenue.value || !elocationUrl.value ||
      !eseats.value || !eprice.value || (!editingEventId && !eimage.files.length)) {
    showAdminMsg("Please fill in all fields before saving an event.", "error");
    return;
  }

  if (!isSafeHttpUrl(elocationUrl.value.trim())) {
    showAdminMsg("Please enter a valid Google Maps link.", "error");
    return;
  }

  const imageFile = eimage.files[0];

  if (imageFile && !imageFile.type.startsWith("image/")) {
    showAdminMsg("Please upload a valid image file.", "error");
    return;
  }

  if (imageFile && imageFile.size > 5 * 1024 * 1024) {
    showAdminMsg("Please upload an image smaller than 5 MB.", "error");
    return;
  }

  const btn = document.getElementById("createEventBtn");
  if (btn) { btn.disabled = true; btn.textContent = editingEventId ? "Saving…" : "Creating…"; }

  try {
    const seats = Number(eseats.value);

    const body = {
      name:        ename.value,
      category:    ecat.value,
      venue:       evenue.value,
      locationUrl: elocationUrl.value.trim(),
      seats,
      available:   seats,          // ← auto-set available = total seats on create
      price:       Number(eprice.value),
      startDate:   estartDate?.value || undefined,
      status:      estatus?.value   || "upcoming",
    };

    /* When editing, don't override available (bookings may have consumed some) */
    if (editingEventId) delete body.available;

    if (imageFile) body.image = await readImageAsDataUrl(imageFile);

    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    await apiFetch(editingEventId ? `/events/${editingEventId}` : "/events", {
      method: editingEventId ? "PUT" : "POST",
      body:   JSON.stringify(body),
    });

    const message = editingEventId ? "Event updated successfully!" : "Event created successfully!";
    resetEventForm();
    showAdminMsg(message, "success");
    renderEvents();
  } catch (e) {
    showAdminMsg("Could not save event: " + e.message, "error");
  } finally {
    if (btn) {
      btn.disabled    = false;
      btn.textContent = editingEventId ? "Save Event" : "Create Event";
    }
  }
}

function showAdminMsg(msg, type) {
  let el = document.getElementById("adminMsg");
  if (!el) {
    el    = document.createElement("div");
    el.id = "adminMsg";
    const panel = document.querySelector(".ev-admin-panel .ev-section-header");
    if (panel) panel.insertAdjacentElement("afterend", el);
  }
  el.className     = `alert ${type === "success" ? "alert-success" : "alert-danger"} py-2 mb-4`;
  el.style.display = "block";
  el.textContent   = msg;
  setTimeout(() => { el.style.display = "none"; }, 4000);
}

/* ── Book Event ── */
let selectedEvent = null;
let paymentModal  = null;

async function book(id) {
  if (!currentUser) { window.location.href = "../login/login.html"; return; }

  try {
    selectedEvent = await apiFetch(`/events/${id}`);

    document.getElementById("paymentEventName").textContent   = selectedEvent.name;
    document.getElementById("paymentSinglePrice").textContent = `${selectedEvent.price} LE`;
    document.getElementById("paymentEventPrice").textContent  = `${selectedEvent.price} LE`;

    const ticketInput = document.getElementById("ticketCount");
    ticketInput.value = 1;

    ticketInput.oninput = () => {
      let tickets = Number(ticketInput.value);
      if (tickets < 1)                        { tickets = 1;                      ticketInput.value = 1; }
      if (tickets > selectedEvent.available)  { tickets = selectedEvent.available; ticketInput.value = tickets; }
      document.getElementById("paymentEventPrice").textContent = `${selectedEvent.price * tickets} LE`;
    };

    document.getElementById("cardForm").style.display = "none";
    clearCardValidation();
    clearPaymentAlert();
    document.getElementById("cardHolder").value = "";
    document.getElementById("cardNumber").value = "";
    document.getElementById("cardExpiry").value = "";
    document.getElementById("cardCVV").value    = "";

    if (!paymentModal) paymentModal = new bootstrap.Modal(document.getElementById("paymentModal"));
    paymentModal.show();
  } catch (e) {
    console.error("Booking error:", e.message);
  }
}

/* ── Delete Event (admin) ── */
async function deleteEvent(id) {
  try {
    await apiFetch("/events/" + id, { method: "DELETE" });
    const bookings = await apiFetch("/bookings");
    for (const b of bookings.filter(b => b.eventId === id)) {
      await apiFetch("/bookings/" + b._id, { method: "DELETE" });
    }
    renderEvents();
  } catch (e) {
    console.error("Delete error:", e.message);
  }
}

/* ── Render Events ── */
async function renderEvents() {
  eventsDiv.innerHTML = renderSkeleton(3);

  try {
    const events = await apiFetch(`/events${getEventQueryString()}`);
    const count  = document.getElementById("eventsCount");
    if (count) count.textContent = `${events.length} event${events.length !== 1 ? "s" : ""}`;

    if (!events.length) {
      eventsDiv.innerHTML = `
        <div class="ev-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
          <p>No events match your filters.</p>
        </div>`;
      return;
    }

    eventsDiv.innerHTML = events.map(e => {
      const soldOut     = e.available <= 0;
      const unavailable = soldOut || ["draft", "completed", "cancelled"].includes(e.status);
      const low         = e.available > 0 && e.available <= 10;
      const categoryLabel = String(e.category || "Event").trim() || "Event";
      const eventImage  = e.image || DEFAULT_EVENT_IMAGE;
      const eventName   = escapeHtml(e.name);
      const eventVenue  = escapeHtml(e.venue);
      const eventStatus = escapeHtml(e.status || "upcoming");
      const eventDate   = escapeHtml(formatEventDate(e.startDate));
      const locationHtml = isSafeHttpUrl(e.locationUrl)
        ? `<a class="ev-location-link" href="${escapeHtml(e.locationUrl)}" target="_blank" rel="noopener noreferrer">${eventVenue}</a>`
        : eventVenue;

      const seatsHtml = soldOut
        ? `<span class="ev-seats-badge sold-out">Sold Out</span>`
        : low
          ? `<span class="ev-seats-badge low">⚡ Only ${e.available} left</span>`
          : `<span class="ev-seats-badge">${e.available} seats available</span>`;

      let actionBtn;
      if (currentUser?.isAdmin === true) {
        actionBtn = `
          <div class="ev-admin-actions">
            <button class="ev-btn-book ev-btn-edit"   onclick='editEvent("${e._id}")'>Edit</button>
            <button class="ev-btn-book ev-btn-delete" onclick='deleteEvent("${e._id}")'>Delete</button>
          </div>`;
      } else if (!currentUser) {
        actionBtn = `<button class="ev-btn-book" style="background:#7aab8e;" onclick="goLogin()">Login to Book</button>`;
      } else {
        actionBtn = `<button class="ev-btn-book" onclick='book("${e._id}")' ${unavailable ? "disabled" : ""}>${unavailable ? "Unavailable" : "Book Now"}</button>`;
      }

      return `
        <div class="col-lg-4 col-md-6 d-flex">
          <div class="ev-event-card w-100 d-flex flex-column">
            <div class="ev-card-image-wrap">
              <img class="ev-card-image" src="${escapeHtml(eventImage)}" alt="${eventName} event image" loading="lazy">
            </div>
            <div class="ev-card-body d-flex flex-column flex-grow-1">
              <span class="ev-card-chip">${escapeHtml(categoryLabel)}</span>
              <h3 class="ev-card-title">${eventName}</h3>
              <div class="ev-card-meta">
                <div class="ev-meta-row">
                  <svg class="ev-meta-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8"  y1="2" x2="8"  y2="6"/>
                    <line x1="3"  y1="10" x2="21" y2="10"/>
                  </svg>
                  ${eventDate} — ${eventStatus}
                </div>
                <div class="ev-meta-row">
                  <svg class="ev-meta-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  ${locationHtml}
                </div>
                <div class="ev-meta-row">
                  <svg class="ev-meta-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  ${seatsHtml}
                </div>
              </div>
              <div class="ev-card-footer mt-auto">
                <div>
                  <div class="ev-price-label">Price</div>
                  <div class="ev-price">${e.price === 0 ? "Free" : Number(e.price).toLocaleString() + " LE"}</div>
                </div>
                ${actionBtn}
              </div>
            </div>
          </div>
        </div>`;
    }).join("");
  } catch (e) {
    eventsDiv.innerHTML = `<div class="ev-empty"><p>Failed to load events. Please try again.</p></div>`;
  }
}

/* ── Skeleton ── */
function renderSkeleton(count) {
  return Array.from({ length: count }, () => `
    <div class="col-lg-4 col-md-6 d-flex">
      <div class="ev-event-card w-100" style="min-height:240px;">
        <div class="ev-card-accent" style="background:#e0ebe5;"></div>
        <div class="ev-card-body">
          <div class="ev-skeleton" style="width:60px;height:20px;border-radius:6px;margin-bottom:14px;"></div>
          <div class="ev-skeleton" style="width:85%;height:22px;border-radius:6px;margin-bottom:10px;"></div>
          <div class="ev-skeleton" style="width:65%;height:16px;border-radius:6px;margin-bottom:8px;"></div>
          <div class="ev-skeleton" style="width:50%;height:16px;border-radius:6px;"></div>
        </div>
      </div>
    </div>`).join("");
}

/* ── Update UI ── */
function updateUI() {
  currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const isAdmin = currentUser?.isAdmin === true;

  if (currentUser) {
    userInfo.innerHTML = "";
    userInfo.append("Hello, ");
    const name = document.createElement("strong");
    name.textContent = currentUser.name;
    userInfo.appendChild(name);
    registerBtn.style.display = "none";
    loginBtn.style.display    = "none";
    profileBtn.style.display  = "inline-block";
    logoutBtn.style.display   = "inline-flex";
    adminPanel.style.display  = isAdmin ? "block" : "none";
  } else {
    userInfo.innerHTML        = "Browse upcoming events or login to book your tickets.";
    logoutBtn.style.display   = "none";
    profileBtn.style.display  = "none";
    adminPanel.style.display  = "none";
    loginBtn.style.display    = "inline-block";
    registerBtn.style.display = "inline-block";
  }

  renderEvents();
}

/* ── Payment Logic ── */

document.getElementById("cashPaymentBtn").addEventListener("click", async () => {
  try {
    clearPaymentAlert();
    await completeBooking({ paymentMethod: "cash", paymentStatus: "pending" });
    paymentModal.hide();
    showCashPaymentToast();
  } catch (e) {
    showToast("Booking failed. Please try again.", "danger", "Booking failed");
  }
});

document.getElementById("cardPaymentBtn").addEventListener("click", () => {
  document.getElementById("cardForm").style.display = "block";
  clearPaymentAlert();
  clearCardValidation();
  document.getElementById("cardHolder").value = "";
  document.getElementById("cardNumber").value = "";
  document.getElementById("cardExpiry").value = "";
  document.getElementById("cardCVV").value    = "";
});

document.getElementById("confirmCardPaymentBtn").addEventListener("click", async () => {
  if (!validateCardDetails()) return;

  const btn = document.getElementById("confirmCardPaymentBtn");

  try {
    clearPaymentAlert();
    btn.disabled    = true;
    btn.textContent = "Processing Payment…";

    await new Promise(resolve => setTimeout(resolve, 1800));
    await completeBooking({ paymentMethod: "card", paymentStatus: "paid" });

    paymentModal.hide();
    showToast("Payment successful. Your booking has been confirmed.", "success", "Payment complete");
  } catch (e) {
    showPaymentAlert("Payment failed. Please try again.");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Pay Securely";
  }
});

async function completeBooking(paymentData) {
  const token   = localStorage.getItem("token");
  const tickets = Number(document.getElementById("ticketCount").value);

  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      eventId:       selectedEvent._id,
      event:         selectedEvent.name,
      tickets,
      amount:        selectedEvent.price * tickets,
      paymentMethod: paymentData.paymentMethod,
      paymentStatus: paymentData.paymentStatus,
    }),
  });

  if (!res.ok) throw new Error(await res.text());

  renderEvents();
}

setupCardInputValidation();
setupEventFilters();
updateUI();