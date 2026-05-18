async function register() {
  const name     = document.getElementById("name").value.trim();
  const email    = document.getElementById("email").value.trim();
  const phone    = document.getElementById("phone").value.trim();
  const age      = document.getElementById("age").value.trim();
  const gender   = document.getElementById("gender").value;
  const password = document.getElementById("password").value.trim();
  const errorMsg   = document.getElementById("errorMsg");
  const successMsg = document.getElementById("successMsg");

  errorMsg.style.display = successMsg.style.display = "none";

  if (!name || !email || !phone || !age || !gender || !password) {
    errorMsg.textContent = "Please fill in all fields.";
    errorMsg.style.display = "block";
    return;
  }

  const emailPattern    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern    = /^[+\d][\d\s()-]{7,19}$/;
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  const numericAge      = Number(age);

  if (!emailPattern.test(email)) {
    errorMsg.textContent = "Please enter a valid email address.";
    errorMsg.style.display = "block";
    return;
  }

  if (!phonePattern.test(phone)) {
    errorMsg.textContent = "Please enter a valid phone number.";
    errorMsg.style.display = "block";
    return;
  }

  if (!Number.isInteger(numericAge) || numericAge < 13 || numericAge > 120) {
    errorMsg.textContent = "Age must be a number between 13 and 120.";
    errorMsg.style.display = "block";
    return;
  }

  if (!passwordPattern.test(password)) {
    errorMsg.textContent = "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
    errorMsg.style.display = "block";
    return;
  }

  const btn = document.querySelector(".auth-btn-primary");
  if (btn) { btn.disabled = true; btn.textContent = "Creating account…"; }

  try {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  name,
  email,
  phone,
  age: numericAge,
  gender,
  password,
}),
    });

    if (!res.ok) {
      const msg = await res.text();
      errorMsg.textContent = msg || "Registration failed. Please try again.";
      errorMsg.style.display = "block";
      return;
    }

    successMsg.textContent = "Account created! Redirecting to login…";
    successMsg.style.display = "block";
    setTimeout(() => { window.location.href = "/login/login.html"; }, 1800);

  } catch (e) {
    errorMsg.textContent = "Registration failed: " + e.message;
    errorMsg.style.display = "block";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `Create Account <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-left:8px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("keydown", e => { if (e.key === "Enter") register(); });
});
