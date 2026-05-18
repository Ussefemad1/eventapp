const token = new URLSearchParams(window.location.search).get("token");

const msg = document.getElementById("msg");

function showMessage(message, type = "danger") {
  msg.className = `alert alert-${type}`;
  msg.textContent = message;
  msg.classList.remove("d-none");
}

async function submitReset() {
  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!newPassword || !confirmPassword) {
    showMessage("Please fill in all fields");
    return;
  }

  if (!passwordPattern.test(newPassword)) {
    showMessage(
      "Password must contain uppercase, lowercase, number and be at least 8 characters"
    );
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage("Passwords do not match");
    return;
  }

  try {
    const res = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        newPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Could not reset password");
      return;
    }

    showMessage(
      data.message || "Password reset successfully",
      "success"
    );

    setTimeout(() => {
      window.location.href = "/login/login.html";
    }, 1800);

  } catch (e) {
    showMessage("Reset failed: " + e.message);
  }
}