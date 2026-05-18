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

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Signing in…";
  }

  try {

    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorMsg.textContent = data.message || "Invalid login";
      errorMsg.style.display = "block";
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("currentUser", JSON.stringify(data.user));

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

function showMessage(element, message, type = "error") {
  element.textContent = message;
  element.className = type === "success" ? "auth-success" : "auth-error";
  element.style.display = "block";
}

function validateNewPassword(newPassword, confirmPassword) {
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!newPassword || !confirmPassword) {
    return "Please enter and confirm your new password.";
  }

  if (!passwordPattern.test(newPassword)) {
    return "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
  }

  if (newPassword !== confirmPassword) {
    return "Passwords do not match.";
  }

  return "";
}

async function resetPassword() {
  const email = document.getElementById("forgotEmail").value.trim();

  const forgotMsg = document.getElementById("forgotMsg");
  const successMsg = document.getElementById("successMsg");
  const resetBtn = document.getElementById("resetPasswordBtn");

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  forgotMsg.style.display = "none";
  successMsg.style.display = "none";

  if (!emailPattern.test(email)) {
    showMessage(
      forgotMsg,
      "Please enter a valid email address."
    );
    return;
  }

  resetBtn.disabled = true;
  resetBtn.textContent = "Sending...";

  try {

    const res = await fetch("/api/users/forgot-password", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage(
        forgotMsg,
        data.message || "Could not send reset email."
      );
      return;
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("forgotPasswordModal")
    );

    if (modal) modal.hide();

    document.getElementById("forgotEmail").value = "";

    showMessage(
      successMsg,
      data.message || "Password reset link sent to your email.",
      "success"
    );

  } catch (e) {

    showMessage(
      forgotMsg,
      "Failed to send reset email: " + e.message
    );

  } finally {

    resetBtn.disabled = false;
    resetBtn.textContent = "Reset Password";

  }
}

document.addEventListener("DOMContentLoaded", () => {
  const resetBtn = document.getElementById("resetPasswordBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetPassword);

  document.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (document.getElementById("forgotPasswordModal")?.classList.contains("show")) {
      resetPassword();
      return;
    }
    login();
  });
});
