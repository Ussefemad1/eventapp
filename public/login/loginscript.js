async function login() {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.style.display = "none";

  if (!email || !password) {
    errorMsg.textContent = "Please enter both your email and password.";
    errorMsg.style.display = "block";
    return;
  }

  const btn = document.querySelector(".auth-btn-primary");
  if (btn) { btn.disabled = true; btn.textContent = "Signing in…"; }

  try {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      errorMsg.textContent = "Invalid email or password. Please try again.";
      errorMsg.style.display = "block";
      return;
    }

    const user = await res.json();
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    window.location.href = "/home/home.html";

  } catch (e) {
    errorMsg.textContent = "Login failed: " + e.message;
    errorMsg.style.display = "block";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `Sign In <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="margin-left:8px;vertical-align:-2px"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("keydown", e => { if (e.key === "Enter") login(); });
});