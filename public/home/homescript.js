const userInfo    = document.getElementById("userInfo");
const adminPanel  = document.getElementById("adminPanel");
const eventsDiv   = document.getElementById("events");
const bookingsDiv = document.getElementById("bookings");
const logoutBtn   = document.getElementById("logout");
const registerBtn = document.getElementById("registerBtn");
const loginBtn    = document.getElementById("loginBtn");

let currentUser = JSON.parse(localStorage.getItem("currentUser"));
const token = localStorage.getItem("token");

const API = "/api";

async function apiFetch(path, options = {}) {

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(API + path, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

function goRegister() { window.location.href = "/register/register.html"; }
function goLogin()    { window.location.href = "/login/login.html"; }

function logout() {

  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");

  currentUser = null;

  updateUI();
}

/* ── Create Event ── */
async function addEvent() {
  const ename  = document.getElementById("ename");
  const ecat   = document.getElementById("ecat");
  const evenue = document.getElementById("evenue");
  const eseats = document.getElementById("eseats");
  const eprice = document.getElementById("eprice");

  if (!ename.value || !ecat.value || !evenue.value || !eseats.value || !eprice.value) {
    showAdminMsg("Please fill in all fields before creating an event.", "error");
    return;
  }

  const btn = document.getElementById("createEventBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Creating…"; }

  try {
    await apiFetch("/events", {
      method: "POST",
      body: JSON.stringify({
        name:      ename.value,
        category:  ecat.value,
        venue:     evenue.value,
        seats:     Number(eseats.value),
        price:     Number(eprice.value),
        available: Number(eseats.value),
      }),
    });

    ename.value = ecat.value = evenue.value = eseats.value = eprice.value = "";
    showAdminMsg("Event created successfully!", "success");
    renderEvents();

  } catch (e) {
    showAdminMsg("Could not create event: " + e.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-right:7px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Create Event`;
    }
  }
}

function showAdminMsg(msg, type) {
  let el = document.getElementById("adminMsg");
  if (!el) {
    el = document.createElement("div");
    el.id = "adminMsg";
    el.style.cssText = "border-radius:9px;padding:11px 16px;font-size:.875rem;margin-bottom:20px;";
    const panel = document.querySelector(".ev-admin-panel .ev-section-header");
    if (panel) panel.insertAdjacentElement("afterend", el);
  }
  el.style.display = "block";
  if (type === "success") {
    el.style.background = "#e6f4ec"; el.style.border = "1px solid #a7d9bc"; el.style.color = "#1a6639";
  } else {
    el.style.background = "#fef2f2"; el.style.border = "1px solid #fecaca"; el.style.color = "#b91c1c";
  }
  el.textContent = msg;
  setTimeout(() => { el.style.display = "none"; }, 4000);
}

/* ── Book Event ── */
async function book(id) {
  if (!currentUser) { window.location.href = "/login/login.html"; return; }

  try {
    const res = await fetch(`/api/events/${id}/book`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
    if (res.status === 409) { renderEvents(); return; }
    const eventData = await res.json();
 await fetch("/api/bookings", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    eventId: id,
    event: eventData.name
  }),
});
    renderEvents();
    renderBookings();
  } catch (e) {
    console.error("Booking error:", e.message);
  }
}

/* ── Cancel Booking ── */
async function cancelBooking(eventId) {
  try {
    const bookings = await fetch("/api/bookings", {
  headers: {
    Authorization: `Bearer ${token}`
  }
}).then(r => r.json());
    const booking  = bookings.find(b => b.user === currentUser.email && b.eventId === eventId);
    if (!booking) return;
    await fetch(`/api/bookings/${booking._id}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
   await fetch(`/api/events/${eventId}/cancel`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`
  }
});
    renderEvents();
    renderBookings();
  } catch (e) {
    console.error("Cancel error:", e.message);
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
    renderBookings();
  } catch (e) {
    console.error("Delete error:", e.message);
  }
}

/* ── Render Events ── */
async function renderEvents() {
  eventsDiv.innerHTML = renderSkeleton(3);

  try {
    const events = await apiFetch("/events");
    const count  = document.getElementById("eventsCount");
    if (count) count.textContent = `${events.length} event${events.length !== 1 ? "s" : ""}`;

    if (!events.length) {
      eventsDiv.innerHTML = `
        <div class="ev-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>No events yet. Check back soon!</p>
        </div>`;
      return;
    }

    eventsDiv.innerHTML = events.map(e => {
      const soldOut = e.available <= 0;
      const low     = e.available > 0 && e.available <= 10;

      const seatsHtml = soldOut
        ? `<span class="ev-seats-badge sold-out">Sold Out</span>`
        : low
          ? `<span class="ev-seats-badge low">⚡ Only ${e.available} left</span>`
          : `<span class="ev-seats-badge">${e.available} seats available</span>`;

      let actionBtn;
      if (currentUser?.isAdmin === true) {
        actionBtn = `<button class="ev-btn-book ev-btn-delete" onclick='deleteEvent("${e._id}")'>Delete Event</button>`;
      } else if (!currentUser) {
        actionBtn = `<button class="ev-btn-book" style="background:#7aab8e;" onclick="goLogin()">Login to Book</button>`;
      } else {
        actionBtn = `<button class="ev-btn-book" onclick='book("${e._id}")' ${soldOut ? "disabled" : ""}>${soldOut ? "Sold Out" : "Book Now"}</button>`;
      }

      return `
        <div class="col-lg-4 col-md-6 d-flex">
          <div class="ev-event-card w-100 d-flex flex-column">
            <div class="ev-card-accent"></div>
            <div class="ev-card-body d-flex flex-column flex-grow-1">
              <span class="ev-card-chip">${e.category}</span>
              <h3 class="ev-card-title">${e.name}</h3>
              <div class="ev-card-meta">
                <div class="ev-meta-row">
                  <svg class="ev-meta-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  ${e.venue}
                </div>
                <div class="ev-meta-row">
                  <svg class="ev-meta-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  ${seatsHtml}
                </div>
              </div>
              <div class="ev-card-footer mt-auto">
                <div>
                  <div class="ev-price-label">Price</div>
                  <div class="ev-price">${e.price === 0 ? "Free" : "$" + Number(e.price).toLocaleString()}</div>
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

/* ── Render Bookings ── */
async function renderBookings() {
  const count = document.getElementById("bookingsCount");

  if (!currentUser) {
    if (count) count.textContent = "0 bookings";
    bookingsDiv.innerHTML = `
      <div class="ev-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
        <p>Login to view your bookings.</p>
      </div>`;
    return;
  }

  bookingsDiv.innerHTML = renderSkeleton(2);

  try {
    const all  = await apiFetch("/bookings");
    const mine = all.filter(b => b.user === currentUser.email);
    if (count) count.textContent = `${mine.length} booking${mine.length !== 1 ? "s" : ""}`;

    if (!mine.length) {
      bookingsDiv.innerHTML = `
        <div class="ev-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
          <p>No bookings yet. Find an event and book your spot!</p>
        </div>`;
      return;
    }

    bookingsDiv.innerHTML = mine.map(b => `
      <div class="col-lg-4 col-md-6 d-flex">
        <div class="ev-ticket-card w-100 d-flex flex-column">
          <div class="ev-ticket-top">
            <div class="ev-ticket-label">Eventify Ticket</div>
            <div class="ev-ticket-name">${b.event}</div>
            <div class="ev-ticket-meta">
              <div class="ev-ticket-row">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                Booking #${String(b._id).slice(-6).toUpperCase()}
              </div>
              <div class="ev-ticket-row">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/></svg>
                ${b.user}
              </div>
            </div>
          </div>
          <div class="ev-ticket-divider"><div class="ev-ticket-dot"></div></div>
          <div class="ev-ticket-bottom mt-auto">
            <div>
              <div class="ev-ticket-price-label">Status</div>
              <div class="ev-ticket-status">Confirmed ✓</div>
            </div>
            <button class="ev-btn-cancel" onclick='cancelBooking("${b.eventId}")'>Cancel</button>
          </div>
        </div>
      </div>`).join("");

  } catch (e) {
    bookingsDiv.innerHTML = "";
  }
}

/* ── Skeleton Loader ── */
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
  if (currentUser) {
    userInfo.innerHTML  = `Hello, <strong>${currentUser.name}</strong> &mdash; ${currentUser.email}`;
    registerBtn.style.display = "none";
    loginBtn.style.display    = "none";
    logoutBtn.style.display   = "inline-flex";
    adminPanel.style.display  = currentUser.isAdmin === true ? "block" : "none";
  } else {
    userInfo.innerHTML = "Browse upcoming events or login to book your tickets.";
    logoutBtn.style.display   = "none";
    adminPanel.style.display  = "none";
    loginBtn.style.display    = "inline-block";
    registerBtn.style.display = "inline-block";
  }
  renderEvents();
  renderBookings();
}

updateUI();