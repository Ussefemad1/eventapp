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

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      errorMsg.textContent = data.message || "Registration failed. Please try again.";
      errorMsg.style.display = "block";
      return;
    }

    // Account created — a 6-digit code was emailed. Verify it to finish.
    successMsg.textContent = "Account created! Check your email for a verification code.";
    successMsg.style.display = "block";
    openOtpVerification(data.email || email);

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

// ─── EMAIL VERIFICATION (OTP) ─────────────────────────────────────────────────
// Injects a small verification popup, posts the code to /api/users/verify-otp,
// then stores the returned session token and redirects — same as a normal login.
function openOtpVerification(email) {
  const existing = document.getElementById("otpOverlay");
  if (existing) {
    existing.dataset.email = email;
    const label = document.getElementById("otpEmailLabel");
    if (label) label.textContent = email;
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "otpOverlay";
  overlay.dataset.email = email;
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;" +
    "background:rgba(8,20,14,0.72);backdrop-filter:blur(4px);padding:16px;font-family:Arial,sans-serif;";

  overlay.innerHTML = `
    <div style="position:relative;width:100%;max-width:380px;background:#fff;border-radius:18px;padding:30px 28px;box-shadow:0 24px 60px rgba(0,0,0,0.35);">
      <button id="otpClose" aria-label="Close" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:22px;line-height:1;color:#9bb0a6;cursor:pointer;">&times;</button>
      <h2 style="margin:0 0 6px;color:#0d3d22;font-size:21px;font-weight:700;">Verify your email</h2>
      <p style="margin:0 0 20px;color:#7a9186;font-size:14px;">
        Enter the 6-digit code we sent to <strong id="otpEmailLabel" style="color:#0d3d22;">${email}</strong>.
      </p>
      <input id="otpInput" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="······"
        style="width:100%;box-sizing:border-box;text-align:center;letter-spacing:10px;font-size:26px;font-weight:700;padding:14px;border:1px solid #cfe0d7;border-radius:12px;color:#0d3d22;outline:none;" />
      <p id="otpMsg" style="display:none;margin:12px 0 0;font-size:13px;"></p>
      <button id="otpVerifyBtn" style="margin-top:18px;width:100%;background:#0d3d22;color:#fff;border:none;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;">Verify &amp; continue</button>
      <p style="margin:16px 0 0;text-align:center;color:#7a9186;font-size:13px;">
        Didn't get it? <a id="otpResend" href="#" style="color:#1d7a46;font-weight:700;text-decoration:none;">Resend code</a>
      </p>
    </div>
  `;

  document.body.appendChild(overlay);

  const input     = overlay.querySelector("#otpInput");
  const msg       = overlay.querySelector("#otpMsg");
  const verifyBtn = overlay.querySelector("#otpVerifyBtn");
  const resend    = overlay.querySelector("#otpResend");
  const closeBtn  = overlay.querySelector("#otpClose");

  input.focus();
  input.addEventListener("input", () => { input.value = input.value.replace(/\D/g, ""); });
  input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submitOtp(); } });
  verifyBtn.addEventListener("click", submitOtp);
  resend.addEventListener("click", e => { e.preventDefault(); resendOtp(); });
  closeBtn.addEventListener("click", () => overlay.remove());

  function setMsg(text, ok) {
    msg.textContent = text;
    msg.style.color = ok ? "#15803d" : "#b91c1c";
    msg.style.display = "block";
  }

  async function submitOtp() {
    const otp = input.value.trim();
    if (otp.length !== 6) { setMsg("Enter the 6-digit code.", false); return; }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying…";
    try {
      const res = await fetch("/api/users/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: overlay.dataset.email, otp }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) { setMsg(data.message || "Invalid code.", false); return; }

      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      setMsg("Verified! Redirecting…", true);
      window.location.href = "/home/home.html";
    } catch (err) {
      setMsg("Something went wrong: " + err.message, false);
    } finally {
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify & continue";
    }
  }

  async function resendOtp() {
    setMsg("Sending a new code…", true);
    try {
      const res = await fetch("/api/users/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: overlay.dataset.email }),
      });
      const data = await res.json().catch(() => ({}));
      setMsg(data.message || "A new code has been sent.", true);
    } catch (err) {
      setMsg("Could not resend: " + err.message, false);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    if (document.getElementById("otpOverlay")) return; // OTP popup handles its own Enter
    register();
  });
});