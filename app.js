const STORAGE_KEY = "mail-triage.emails";

class MailTriageApp {
    constructor() {
        this.emails = [];
        this.selectedId = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadFromStorage();
        this.initializeTheme();
    }

    initializeElements() {
        // Email list elements
        this.emailListEl = document.getElementById("email-list");
        this.emailCountEl = document.getElementById("email-count");
        
        // Detail view elements
        this.detailSubjectEl = document.getElementById("detail-subject");
        this.detailMetaEl = document.getElementById("detail-meta");
        this.detailBadgeEl = document.getElementById("detail-badge");
        this.detailBodyEl = document.getElementById("detail-body");
        this.detailResponseEl = document.getElementById("detail-response");
        this.retryBtn = document.getElementById("retry-btn");
        
        // View management
        this.detailsViewEl = document.getElementById("details-view");
        this.composeViewEl = document.getElementById("compose-view");
        this.newEmailBtn = document.getElementById("new-email-btn");
        
        // Compose form elements
        this.composeTitleEl = document.getElementById("compose-title");
        this.composeBodyEl = document.getElementById("compose-body");
        this.saveEmailBtn = document.getElementById("save-email-btn");
        
        // File upload elements
        this.uploadDropEl = document.getElementById("upload-drop");
        this.uploadSelectBtn = document.getElementById("upload-select");
        this.uploadInputEl = document.getElementById("upload-input");
        this.uploadFilenameEl = document.getElementById("upload-filename");
        
        // Utility buttons
        this.clearBtn = document.getElementById('clear-storage-btn');
        this.themeBtn = document.getElementById('theme-toggle-btn');
    }

    bindEvents() {
        // Email management
        if (this.newEmailBtn) {
            this.newEmailBtn.addEventListener("click", () => this.showComposeView());
        }
        
        if (this.saveEmailBtn) {
            this.saveEmailBtn.addEventListener("click", () => this.handleSaveEmail());
        }
        
        if (this.retryBtn) {
            this.retryBtn.addEventListener("click", () => this.handleRetry());
        }

        // File upload
        if (this.uploadSelectBtn && this.uploadInputEl) {
            this.uploadSelectBtn.addEventListener("click", () => this.uploadInputEl.click());
            this.uploadInputEl.addEventListener("change", (e) => {
                const file = e.target.files && e.target.files[0];
                this.handleFile(file);
            });
        }
        
        if (this.uploadDropEl) {
            this.setupFileDrop();
        }

        // Utility functions
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.handleClearStorage());
        }
        
        if (this.themeBtn) {
            this.themeBtn.addEventListener('click', () => this.toggleTheme());
        }
    }

    setupFileDrop() {
        ["dragenter", "dragover"].forEach((evt) =>
            this.uploadDropEl.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.uploadDropEl.classList.add("border-blue-400", "bg-blue-50");
            })
        );
        
        ["dragleave", "drop"].forEach((evt) =>
            this.uploadDropEl.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.uploadDropEl.classList.remove("border-blue-400", "bg-blue-50");
            })
        );
        
        this.uploadDropEl.addEventListener("drop", (e) => {
            const file = e.dataTransfer?.files?.[0];
            this.handleFile(file);
        });
    }

    // Email List Management
    renderList() {
        this.emailListEl.innerHTML = this.emails
            .map((email) => this.createEmailListItem(email))
            .join("");

        // Add click listeners to email items
        this.emailListEl.querySelectorAll("[data-id]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                this.selectEmail(id);
            });
        });

        this.emailCountEl.textContent = `${this.emails.length} items`;
    }

    createEmailListItem(email) {
        const isSelected = email.id === this.selectedId;
        const base = "w-full text-left px-4 py-3 transition focus:outline-none block";
        const state = isSelected ? "bg-blue-50/70" : "hover:bg-gray-50";
        const ring = isSelected ? "ring-1 ring-inset ring-blue-200" : "";

        const isProductive = email.classification === "Productive";
        const isUnproductive = email.classification === "Unproductive";
        const badgeClass = isProductive
            ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
            : isUnproductive
                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                : "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200";

        return `
            <button data-id="${email.id}" class="${base} ${state} ${ring}">
                <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-gray-900">${this.escapeHtml(email.subject)}</p>
                        <div class="flex items-center min-h-[28px]" style="min-height:28px;">
                            <p class="truncate text-xs text-gray-500 flex items-center" style="height: 100%;">${this.escapeHtml(email.sender || 'Unknown')}</p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end justify-center min-w-[80px] min-h-[28px]" style="min-height:28px;">
                        <span class="shrink-0 text-[11px] text-gray-400">${this.escapeHtml(email.receivedAt)}</span>
                        <span class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium mt-1 ${badgeClass}">${email.classification}</span>
                    </div>
                </div>
                <p class="mt-1 text-sm text-gray-600 line-clamp-2">${this.escapeHtml(email.preview)}</p>
            </button>
        `;
    }

    selectEmail(id) {
        this.selectedId = id;
        const email = this.emails.find((e) => e.id === id);
        this.renderList();
        this.renderDetails(email);
    }

    renderDetails(email) {
        if (!email) {
            this.showEmptyState();
            return;
        }

        this.detailSubjectEl.textContent = email.subject;
        this.detailMetaEl.textContent = `${email.sender} • ${email.receivedAt}`;
        this.detailBadgeEl.textContent = email.classification;
        
        const isProductive = email.classification === "Productive";
        const isUnproductive = email.classification === "Unproductive";
        this.detailBadgeEl.className =
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium " +
            (isProductive
                ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
                : isUnproductive
                    ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                    : "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200");

        this.detailBodyEl.textContent = email.body;
        this.detailResponseEl.textContent = email.aiResponse;

        this.updateRetryButton(email);
    }

    showEmptyState() {
        this.detailSubjectEl.textContent = "Select an email";
        this.detailMetaEl.textContent = "—";
        this.detailBadgeEl.textContent = "—";
        this.detailBadgeEl.className = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700";
        this.detailBodyEl.textContent = "Choose an email from the list to view its contents.";
        this.detailResponseEl.textContent = "";

        if (this.retryBtn) this.retryBtn.classList.add("hidden");
    }

    updateRetryButton(email) {
        if (!this.retryBtn) return;
        
        if (email.classification === "Error") {
            this.retryBtn.classList.remove("hidden");
            this.retryBtn.disabled = false;
        } else {
            this.retryBtn.classList.add("hidden");
        }
    }

    // Email Creation & Processing
    async handleSaveEmail() {
        const title = (this.composeTitleEl.value || "").trim();
        const body = (this.composeBodyEl.value || "").trim();
        
        if (!title && !body) {
            this.composeTitleEl.focus();
            return;
        }

        const newEmail = this.createNewEmail(title, body);
        this.emails.unshift(newEmail);
        this.saveToStorage();
        this.renderList();
        this.showDetailsView();
        this.selectEmail(newEmail.id);

        this.showProcessingState();
        await this.processEmailWithAI(newEmail, title, body);
    }

    createNewEmail(title, body) {
        const id = String(Date.now());
        const now = new Date();
        const receivedAt = now.toISOString().slice(0, 16).replace("T", " ");
        
        return {
            id,
            subject: title || "(Untitled)",
            sender: "you@local",
            receivedAt,
            preview: this.computePreview(body),
            body: body || "",
            classification: "Pending…",
            aiResponse: "Pending…",
            serverId: null,
        };
    }

    showProcessingState() {
        this.detailBadgeEl.textContent = "Processing…";
        this.detailBadgeEl.className =
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200";
        this.detailResponseEl.textContent = "Processing on server…";
    }

    async processEmailWithAI(email, title, body) {
        try {
            const created = await window.API.createEmail(title || "(Untitled)", body || "");
            email.serverId = created.id;
            const done = await this.pollEmailStatus(created.id);
            email.classification = done.classification || "Unknown";
            email.aiResponse = done.suggested_reply || "";
            this.saveToStorage();
            
            if (this.selectedId === email.id) this.renderDetails(email);
            this.renderList();
        } catch (err) {
            email.classification = "Error";
            email.aiResponse = "Processing failed. Please retry.";
            this.saveToStorage();
            
            if (this.selectedId === email.id) this.renderDetails(email);
            this.renderList();
            console.error(err);
        }
    }

    async handleRetry() {
        const email = this.emails.find((e) => e.id === this.selectedId);
        if (!email) return;
        
        this.retryBtn.disabled = true;
        email.classification = "Pending…";
        email.aiResponse = "Retrying…";
        this.saveToStorage();
        this.renderDetails(email);
        
        try {
            const created = await window.API.createEmail(email.subject, email.body || "");
            email.serverId = created.id;
            const done = await this.pollEmailStatus(created.id);
            email.classification = done.classification || "Unknown";
            email.aiResponse = done.suggested_reply || "";
            this.saveToStorage();
            this.renderDetails(email);
            this.renderList();
        } catch (err) {
            email.classification = "Error";
            email.aiResponse = "Processing failed. Please retry.";
            this.saveToStorage();
            this.renderDetails(email);
            this.renderList();
        } finally {
            this.retryBtn.disabled = false;
        }
    }

    // File Handling
    async handleFile(file) {
        if (!file) return;
        
        this.uploadFilenameEl.textContent = file.name;
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        
        if (ext === "txt") {
            const text = await file.text();
            this.composeBodyEl.value = text;
        }
        // PDF parsing not implemented; keep filename preview only
    }

    // View Management
    showComposeView() {
        if (!this.composeViewEl || !this.detailsViewEl) return;
        this.detailsViewEl.classList.add("hidden");
        this.composeViewEl.classList.remove("hidden");
        this.composeTitleEl.value = "";
        this.composeBodyEl.value = "";
        this.uploadInputEl.value = "";
        if (this.uploadFilenameEl) this.uploadFilenameEl.textContent = "";
    }

    showDetailsView() {
        if (!this.composeViewEl || !this.detailsViewEl) return;
        this.composeViewEl.classList.add("hidden");
        this.detailsViewEl.classList.remove("hidden");
    }

    // Storage Management
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.emails));
        } catch (_) { }
    }

    loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            
            this.emails = parsed;
            this.renderList();
            
            if (this.emails[0]) {
                this.selectEmail(this.emails[0].id);
            } else {
                this.renderDetails(null);
            }
        } catch (_) {
            // Silently fail if storage is corrupted
        }
    }

    handleClearStorage() {
        if (confirm('Are you sure you want to clear all saved emails and settings?')) {
            localStorage.clear();
            this.emails = [];
            this.renderList();
            this.renderDetails(null);
        }
    }

    // Theme Management
    initializeTheme() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('theme-dark');
        }
    }

    toggleTheme() {
        document.body.classList.toggle('theme-dark');
        if (document.body.classList.contains('theme-dark')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    }

    // Utility Functions
    computePreview(body) {
        const text = String(body || "").replace(/\s+/g, " ").trim();
        return text.slice(0, 80) + (text.length > 80 ? "..." : "");
    }

    escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async pollEmailStatus(serverId, { intervalMs = 1000, maxMs = 20000 } = {}) {
        const start = Date.now();
        while (Date.now() - start < maxMs) {
            const data = await window.API.getEmailStatus(serverId);
            if (data && data.status === "done") return data;
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        throw new Error("Timeout waiting for processing");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MailTriageApp();
});