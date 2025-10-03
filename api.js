(function () {
  const API_BASE = "http://127.0.0.1:8000";

  async function createEmail(title, content) {
    const res = await fetch(`${API_BASE}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error(`Failed to create email: ${res.status}`);
    return res.json();
  }

  async function getEmailStatus(id) {
    const res = await fetch(`${API_BASE}/emails/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch status: ${res.status}`);
    return res.json();
  }

  window.API = { createEmail, getEmailStatus };
})();


