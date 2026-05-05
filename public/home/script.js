
const userInfo    = document.getElementById("userInfo");
const adminPanel  = document.getElementById("adminPanel");
const eventsDiv   = document.getElementById("events");
const bookingsDiv = document.getElementById("bookings");
const logoutBtn   = document.getElementById("logout");
const registerBtn = document.getElementById("registerBtn");
const loginBtn    = document.getElementById("loginBtn");

// Session restore
let currentUser = JSON.parse(sessionStorage.getItem("currentUser"));

const API = "/api"; 

// Fetch abstract
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Page redirect le ba2y el pages
function goRegister() { window.location.href = "/register/register.html"; }
function goLogin()    { window.location.href = "/login/login.html"; }

// Clear session
function logout() {
  sessionStorage.removeItem("currentUser");
  currentUser = null;
  updateUI();
}

// Create event
async function addEvent() {
  const ename  = document.getElementById("ename");
  const ecat   = document.getElementById("ecat");
  const evenue = document.getElementById("evenue");
  const eseats = document.getElementById("eseats");
  const eprice = document.getElementById("eprice");

  // lazem kol el fields tbaa mawguda 
  if (!ename.value || !ecat.value || !evenue.value || !eseats.value || !eprice.value) {
    alert("Please fill all fields"); return;
  }
  try {
    // publish event
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
    alert("Event created!");
    ename.value = ecat.value = evenue.value = eseats.value = eprice.value = ""; 
    renderEvents();
  } catch (e) { alert("Error: " + e.message); }
}

// book seat
async function book(id) {
  if (!currentUser) { alert("Login required!"); return; } // session check 
  try {
    const res = await fetch(`/api/events/${id}/book`, { method: "PUT" });
    if (res.status === 409) { alert("Sold out"); return; } // Capacity check

    const eventData = await res.json();

    // Save booking
    await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user:    currentUser.email,
        eventId: id,
        event:   eventData.name,
      }),
    });
    renderEvents();
    renderBookings();
  } catch (e) { alert("Error: " + e.message); }
}

// Remove booking
async function cancelBooking(eventId) {
  try {
    const bookings = await fetch("/api/bookings").then(r => r.json());
    const booking = bookings.find(b => b.user === currentUser.email && b.eventId === eventId); // matched in database
    if (!booking) return;

    await fetch(`/api/bookings/${booking._id}`, { method: "DELETE" }); 
    await fetch(`/api/events/${eventId}/cancel`, { method: "PUT" });   

    renderEvents();
    renderBookings();
  } catch (e) { alert("Error: " + e.message); }
}

// Admin delete
async function deleteEvent(id) {
  try {
    await apiFetch("/events/" + id, { method: "DELETE" });

    const bookings = await apiFetch("/bookings");
    for (const b of bookings.filter(b => b.eventId === id)) {
      await apiFetch("/bookings/" + b._id, { method: "DELETE" }); 
    }

    renderEvents();
    renderBookings();
  } catch (e) { alert("Error: " + e.message); }
}

// List events
async function renderEvents() {
  try {
    const events = await apiFetch("/events");
    let html = "";
    for (const e of events) {
      html += `<div class='box'>
        <h3>${e.name}</h3>
        <p>${e.category}</p>
        <p>${e.venue}</p>
        <p>Price: ${e.price}</p>
        <p>Available: ${e.available}</p>`;
      if (!currentUser || currentUser.isAdmin !== true)
        html += `<button onclick='book("${e._id}")'>Book</button>`; // User action
      if (currentUser?.isAdmin === true)
        html += `<button onclick='deleteEvent("${e._id}")'>Delete</button>`; // Admin action (privilege check)
      html += `</div>`;
    }
    eventsDiv.innerHTML = html;
  } catch (e) { eventsDiv.innerHTML = "<p>Failed to load events</p>"; }
}

// User tickets
async function renderBookings() {
  if (!currentUser) { bookingsDiv.innerHTML = ""; return; } // lazem ykoon logged in 
  try {
    const bookings = await apiFetch("/bookings");
    let html = "";
    for (const b of bookings.filter(b => b.user === currentUser.email)) { 
      html += `<div class='ticket'>
        <h3>${b.event}</h3>
        <p>🎟 Eventify Ticket</p>
        <button onclick='cancelBooking("${b.eventId}")'>Cancel Booking</button>
        </div>`;
    }
    bookingsDiv.innerHTML = html;
  } catch (e) { bookingsDiv.innerHTML = ""; }
}

// Refresh UI
function updateUI() {
  if (currentUser) {
    userInfo.innerHTML = "Welcome, " + currentUser.name;
    registerBtn.style.display = "none";
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    adminPanel.style.display = currentUser.isAdmin === true ? "block" : "none"; // bat2akd mn el role
  } else {
    // Guest 
    userInfo.innerHTML = "";
    logoutBtn.style.display = "none";
    adminPanel.style.display = "none";
    loginBtn.style.display = "inline-block";
    registerBtn.style.display = "inline-block";
  }
  renderEvents();
  renderBookings();
}

updateUI(); 