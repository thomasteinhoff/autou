(function () {
  const API_BASE = "";
  
  async function createEmail(title, content) {
    const res = await fetch(`/emails`, {  // Relative URL
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error(`Failed to create email: ${res.status}`);
    return res.json();
  }

  async function getEmailStatus(id) {
    const res = await fetch(`/emails/${id}`);  // Relative URL
    if (!res.ok) throw new Error(`Failed to fetch status: ${res.status}`);
    return res.json();
  }

  window.API = { createEmail, getEmailStatus };
})();