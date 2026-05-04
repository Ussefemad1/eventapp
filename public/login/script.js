async function login() {
  const email    = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) { alert("Please fill all fields"); return; }

  try {
    const res = await fetch("/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) { alert("Invalid login"); return; }

    const user = await res.json();
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    alert("Login successful");
    window.location.href = "/home/home.html";
  } catch (e) {
    alert("Login failed: " + e.message);
  }
}