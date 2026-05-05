async function register() {
  // Field values
  const name     = document.getElementById("name").value;
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!name || !email || !password) { alert("Please fill all fields"); return; } // Validate inputs

  // Regex 
  const emailPattern    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!emailPattern.test(email))       { alert("Invalid email format"); return; }    // Email check
  if (!passwordPattern.test(password)) {
    alert("Password must be at least 8 characters and include uppercase, lowercase, and a number");
    return; // Strength check
  }

  try {
    // register new user 
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, isAdmin: false }), // Default role(non-admin)
    });

    if (!res.ok) { alert("Registration failed"); return; }

    window.location.href = "/login/login.html"; // Redirect
  } catch (e) {
    alert("Registration failed: " + e.message);
  }
}