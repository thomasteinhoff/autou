const STORAGE_KEY = "mail-triage.emails";

let emails = [];

const emailListEl = document.getElementById("email-list");
const emailCountEl = document.getElementById("email-count");

const detailSubjectEl = document.getElementById("detail-subject");
const detailMetaEl = document.getElementById("detail-meta");
const detailBadgeEl = document.getElementById("detail-badge");
const detailBodyEl = document.getElementById("detail-body");
const detailResponseEl = document.getElementById("detail-response");
const newEmailBtn = document.getElementById("new-email-btn");
const detailsViewEl = document.getElementById("details-view");
const composeViewEl = document.getElementById("compose-view");
const composeTitleEl = document.getElementById("compose-title");
const composeBodyEl = document.getElementById("compose-body");
const saveEmailBtn = document.getElementById("save-email-btn");
const uploadDropEl = document.getElementById("upload-drop");
const uploadSelectBtn = document.getElementById("upload-select");
const uploadInputEl = document.getElementById("upload-input");
const uploadFilenameEl = document.getElementById("upload-filename");
const retryBtn = document.getElementById("retry-btn");

let selectedId = null;

function renderList() {
  emailListEl.innerHTML = emails
    .map((e) => {
      const isSelected = e.id === selectedId;
      const base = "w-full text-left px-4 py-3 transition focus:outline-none block";
      const state = isSelected ? "bg-blue-50/70" : "hover:bg-gray-50";
      const ring = isSelected ? "ring-1 ring-inset ring-blue-200" : "";

      const isProductive = e.classification === "Productive";
      const isUnproductive = e.classification === "Unproductive";
      const badgeClass = isProductive
        ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
        : isUnproductive
        ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
        : "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200";

      return `
        <button data-id="${e.id}" class="${base} ${state} ${ring}">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900">${escapeHtml(e.subject)}</p>
              <div class="flex items-center gap-2">
                <p class="truncate text-xs text-gray-500">${escapeHtml(e.sender || 'Unknown')}</p>
                <span class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClass}">${e.classification}</span>
              </div>
            </div>
            <span class="shrink-0 text-[11px] text-gray-400">${escapeHtml(e.receivedAt)}</span>
          </div>
          <p class="mt-1 text-sm text-gray-600 line-clamp-2">${escapeHtml(e.preview)}</p>
        </button>
      `;
    })
    .join("");

  emailListEl.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      selectEmail(id);
    });
  });

  emailCountEl.textContent = `${emails.length} items`;
}

function selectEmail(id) {
  selectedId = id;
  const email = emails.find((e) => e.id === id);
  if (!email) return;

  renderList();
  renderDetails(email);
}

function renderDetails(email) {
  detailSubjectEl.textContent = email.subject;
  detailMetaEl.textContent = `${email.sender} • ${email.receivedAt}`;
  detailBadgeEl.textContent = email.classification;
  const isProductive = email.classification === "Productive";
  const isUnproductive = email.classification === "Unproductive";
  detailBadgeEl.className =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium " +
    (isProductive
      ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
      : isUnproductive
      ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
      : "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200");

  detailBodyEl.textContent = email.body;
  detailResponseEl.textContent = email.aiResponse;

  if (retryBtn) {
    if (email.classification === "Error") {
      retryBtn.classList.remove("hidden");
      retryBtn.disabled = false;
    } else {
      retryBtn.classList.add("hidden");
    }
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showComposeView() {
  if (!composeViewEl || !detailsViewEl) return;
  detailsViewEl.classList.add("hidden");
  composeViewEl.classList.remove("hidden");
  composeTitleEl.value = "";
  composeBodyEl.value = "";
  uploadInputEl.value = "";
  if (uploadFilenameEl) uploadFilenameEl.textContent = "";
}

function showDetailsView() {
  if (!composeViewEl || !detailsViewEl) return;
  composeViewEl.classList.add("hidden");
  detailsViewEl.classList.remove("hidden");
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
  } catch (_) {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function computePreview(body) {
  const text = String(body || "").replace(/\s+/g, " ").trim();
  return text.slice(0, 80) + (text.length > 80 ? "..." : "");
}

async function handleFile(file) {
  if (!file) return;
  uploadFilenameEl.textContent = file.name;
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "txt") {
    const text = await file.text();
    composeBodyEl.value = text;
  } else if (ext === "pdf") {
    // PDF parsing not implemented; keep filename preview only
  }
}

async function pollEmailStatus(serverId, { intervalMs = 1000, maxMs = 20000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const data = await window.API.getEmailStatus(serverId);
    if (data && data.status === "done") return data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timeout waiting for processing");
}

(function init() {
  const fromStore = loadFromStorage();
  emails = fromStore || [];
  renderList();
  if (emails[0]) selectEmail(emails[0].id);

  if (newEmailBtn) {
    newEmailBtn.addEventListener("click", showComposeView);
  }

  if (saveEmailBtn) {
    saveEmailBtn.addEventListener("click", async () => {
      const title = (composeTitleEl.value || "").trim();
      const body = (composeBodyEl.value || "").trim();
      if (!title && !body) {
        composeTitleEl.focus();
        return;
      }

      const id = String(Date.now());
      const now = new Date();
      const receivedAt = now.toISOString().slice(0, 16).replace("T", " ");
      const newEmail = {
        id,
        subject: title || "(Untitled)",
        sender: "you@local",
        receivedAt,
        preview: computePreview(body),
        body: body || "",
        classification: "Pending…",
        aiResponse: "Pending…",
        serverId: null,
      };
      emails.unshift(newEmail);
      saveToStorage();
      renderList();
      showDetailsView();
      selectEmail(newEmail.id);

      detailBadgeEl.textContent = "Processing…";
      detailBadgeEl.className =
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200";
      detailResponseEl.textContent = "Processing on server…";

      try {
        const created = await window.API.createEmail(title || "(Untitled)", body || "");
        newEmail.serverId = created.id;
        const done = await pollEmailStatus(created.id);
        newEmail.classification = done.classification || "Unknown";
        newEmail.aiResponse = done.suggested_reply || "";
        saveToStorage();
        if (selectedId === newEmail.id) renderDetails(newEmail);
        renderList();
      } catch (err) {
        newEmail.classification = "Error";
        newEmail.aiResponse = "Processing failed. Please retry.";
        saveToStorage();
        if (selectedId === newEmail.id) renderDetails(newEmail);
        renderList();
        console.error(err);
      }
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener("click", async () => {
      const email = emails.find((e) => e.id === selectedId);
      if (!email) return;
      retryBtn.disabled = true;
      email.classification = "Pending…";
      email.aiResponse = "Retrying…";
      saveToStorage();
      renderDetails(email);
      try {
        const created = await window.API.createEmail(email.subject, email.body || "");
        email.serverId = created.id;
        const done = await pollEmailStatus(created.id);
        email.classification = done.classification || "Unknown";
        email.aiResponse = done.suggested_reply || "";
        saveToStorage();
        renderDetails(email);
        renderList();
      } catch (err) {
        email.classification = "Error";
        email.aiResponse = "Processing failed. Please retry.";
        saveToStorage();
        renderDetails(email);
        renderList();
      } finally {
        retryBtn.disabled = false;
      }
    });
  }

  if (uploadSelectBtn && uploadInputEl) {
    uploadSelectBtn.addEventListener("click", () => uploadInputEl.click());
    uploadInputEl.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      handleFile(file);
    });
  }
  if (uploadDropEl) {
    ["dragenter", "dragover"].forEach((evt) =>
      uploadDropEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadDropEl.classList.add("border-blue-400", "bg-blue-50");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      uploadDropEl.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadDropEl.classList.remove("border-blue-400", "bg-blue-50");
      })
    );
    uploadDropEl.addEventListener("drop", (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      handleFile(file);
    });
  }
})();


