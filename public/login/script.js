async function login() {
  // Field values
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) { alert("Please fill all fields"); return; } // Validate inputs

  try {
    // Send login request
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) { alert("Invalid login"); return; } // Auth failed

    const user = await res.json();
    sessionStorage.setItem("currentUser", JSON.stringify(user)); // Save session if user is valid
    alert("Login successful");
    window.location.href = "/home/home.html"; // Redirect
  } catch (e) {
    alert("Login failed: " + e.message);
  }
}