import "./dashboard.css";

import { BROWSER_CAPABILITY_HEADER } from "../utils/security-constants.js";
import { isRecord } from "../types.js";
import { formatDocumentSize, formatRelativeTime } from "../utils/home-view.js";

interface DashboardDocument {
  id: string;
  title: string;
  filename: string;
  size: number;
  created_at: string;
  is_shared: number;
}

interface DashboardConfig {
  page: number;
  pageSize: number;
  totalCount: number;
  homeCapabilityToken: string;
  authMode: string;
  clerkPublishableKey?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shareBadge(mode: number): { label: string; cls: string } {
  if (mode === 1) return { label: "link", cls: "badge-link" };
  if (mode === 2) return { label: "email", cls: "badge-email" };
  return { label: "private", cls: "badge-private" };
}

function getConfig(): DashboardConfig | null {
  const config = Reflect.get(window, "__DASHBOARD_CONFIG__");
  if (!isRecord(config)) return null;
  if (typeof config.page !== "number" || !Number.isFinite(config.page)) return null;
  if (typeof config.pageSize !== "number" || !Number.isFinite(config.pageSize)) return null;
  if (typeof config.totalCount !== "number" || !Number.isFinite(config.totalCount)) return null;
  if (typeof config.homeCapabilityToken !== "string" || config.homeCapabilityToken.length === 0) return null;

  return {
    page: config.page,
    pageSize: config.pageSize,
    totalCount: config.totalCount,
    homeCapabilityToken: config.homeCapabilityToken,
    authMode: typeof config.authMode === "string" ? config.authMode : "none",
    clerkPublishableKey: typeof config.clerkPublishableKey === "string" ? config.clerkPublishableKey : undefined,
  };
}

function dashboardFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set(BROWSER_CAPABILITY_HEADER, config!.homeCapabilityToken);
  return fetch(input, { ...init, headers });
}

let config: DashboardConfig | null = null;
let deleteTargetId: string | null = null;

function renderDocumentCard(doc: DashboardDocument): string {
  const badge = shareBadge(doc.is_shared);
  return `
    <div class="doc-grid-card" data-doc-id="${escapeHtml(doc.id)}">
      <div class="doc-grid-preview">
        <iframe
          class="doc-grid-iframe"
          sandbox="allow-scripts"
          loading="lazy"
          src="/d/${escapeHtml(doc.id)}.html"
        ></iframe>
      </div>
      <div class="doc-grid-info">
        <div class="doc-grid-top">
          <a class="doc-grid-card-title" href="/d/${escapeHtml(doc.id)}">${escapeHtml(doc.title)}</a>
          <span class="doc-grid-filename">${escapeHtml(doc.filename)}</span>
        </div>
        <div class="doc-grid-meta">
          <span>${formatDocumentSize(doc.size)}</span>
          <span>${formatRelativeTime(doc.created_at)}</span>
          <span class="share-badge ${badge.cls}">${badge.label}</span>
        </div>
        <div class="doc-grid-actions">
          <a class="doc-grid-btn doc-grid-btn-view" href="/d/${escapeHtml(doc.id)}">view</a>
          <button class="doc-grid-btn doc-grid-btn-delete" data-doc-id="${escapeHtml(doc.id)}">delete</button>
        </div>
      </div>
    </div>
  `;
}

function renderDocuments(docs: DashboardDocument[]): void {
  const grid = document.getElementById("doc-grid");
  if (!grid) return;

  if (docs.length === 0) {
    grid.innerHTML = `
      <div class="dashboard-empty">
        <p>No documents found.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = docs.map(renderDocumentCard).join("");
}

function renderPagination(page: number, totalCount: number, pageSize: number): void {
  const container = document.getElementById("doc-grid-pagination");
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let prevHtml = '<div class="pagination-spacer"></div>';
  if (page > 1) {
    prevHtml = `<button class="pagination-link" data-page="${page - 1}">previous</button>`;
  }

  let nextHtml = '<div class="pagination-spacer"></div>';
  if (page < totalPages) {
    nextHtml = `<button class="pagination-link" data-page="${page + 1}">next</button>`;
  }

  container.innerHTML = `
    ${prevHtml}
    <span class="pagination-status">page ${page} of ${totalPages}</span>
    ${nextHtml}
  `;
}

function updateDocCount(totalCount: number): void {
  const el = document.getElementById("doc-count");
  if (!el) return;
  el.textContent = `${totalCount} document${totalCount !== 1 ? "s" : ""}`;
}

async function loadDocuments(page: number): Promise<void> {
  if (!config) return;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(config.pageSize));

  const response = await dashboardFetch(`/api/documents?${searchParams.toString()}`);
  if (!response.ok) return;

  const data = await response.json();
  if (!isRecord(data) || !Array.isArray(data.documents)) return;

  const docs: DashboardDocument[] = data.documents.map((d: unknown) => {
    if (!isRecord(d)) return null;
    return {
      id: typeof d.id === "string" ? d.id : "",
      title: typeof d.title === "string" ? d.title : "",
      filename: typeof d.filename === "string" ? d.filename : "",
      size: typeof d.size === "number" ? d.size : 0,
      created_at: typeof d.created_at === "string" ? d.created_at : "",
      is_shared: typeof d.is_shared === "number" ? d.is_shared : 0,
    };
  }).filter(Boolean) as DashboardDocument[];

  const totalCount = typeof data.totalCount === "number" ? data.totalCount : docs.length;
  const returnedPage = typeof data.page === "number" ? data.page : page;

  renderDocuments(docs);
  renderPagination(returnedPage, totalCount, config.pageSize);
  updateDocCount(totalCount);
  config.page = returnedPage;
  config.totalCount = totalCount;
}

async function deleteDocument(docId: string): Promise<boolean> {
  if (!config) return false;

  try {
    const response = await dashboardFetch(`/api/documents/${docId}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}

function showDeleteModal(docId: string): void {
  deleteTargetId = docId;
  const modal = document.getElementById("delete-modal");
  if (modal) modal.style.display = "flex";
}

function hideDeleteModal(): void {
  deleteTargetId = null;
  const modal = document.getElementById("delete-modal");
  if (modal) modal.style.display = "none";
}

function showApiKeyModal(key: string): void {
  const modal = document.getElementById("api-key-modal");
  const value = document.getElementById("api-key-value");
  if (modal && value) {
    value.textContent = key;
    modal.style.display = "flex";
  }
}

function hideApiKeyModal(): void {
  const modal = document.getElementById("api-key-modal");
  if (modal) modal.style.display = "none";
}

function initClerkUserButton(): void {
  if (!config?.clerkPublishableKey) return;

  const clerk = (window as unknown as Record<string, unknown>).Clerk as
    | { load: () => Promise<void>; isSignedIn: boolean; mountUserButton: (node: HTMLDivElement) => void; openSignIn: () => void }
    | undefined;

  if (!clerk) return;

  clerk.load().then(() => {
    const node = document.getElementById("clerk-user-btn");
    if (node instanceof HTMLDivElement) {
      clerk.mountUserButton(node);
    }
  }).catch(() => {
    // Clerk load failed silently
  });
}

function initDashboard(): void {
  config = getConfig();
  if (!config) return;

  // Initialize preview iframes from SSR-rendered cards
  document.querySelectorAll<HTMLElement>(".doc-grid-iframe[data-preview-src]").forEach((iframe) => {
    const src = iframe.dataset.previewSrc;
    if (src) {
      iframe.removeAttribute("data-preview-src");
      iframe.setAttribute("src", src);
    }
  });

  // Render initial pagination controls for SSR content
  renderPagination(config.page, config.totalCount, config.pageSize);

  // Delete button delegation
  const grid = document.getElementById("doc-grid");
  if (grid) {
    grid.addEventListener("click", (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("doc-grid-btn-delete")) return;
      const docId = target.dataset.docId;
      if (docId) showDeleteModal(docId);
    });
  }

  // Delete modal
  const deleteConfirmBtn = document.getElementById("delete-confirm-btn");
  const deleteCancelBtn = document.getElementById("delete-cancel-btn");
  const deleteModal = document.getElementById("delete-modal");

  if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener("click", async () => {
      if (!deleteTargetId) return;
      const ok = await deleteDocument(deleteTargetId);
      if (ok) {
        const card = document.querySelector(`[data-doc-id="${deleteTargetId}"]`);
        if (card) card.remove();
        config!.totalCount--;
        updateDocCount(config!.totalCount);
        const remainingCards = document.querySelectorAll("[data-doc-id]").length;
        if (config!.totalCount === 0) {
          loadDocuments(1);
        } else if (remainingCards === 0) {
          loadDocuments(Math.max(1, config!.page - 1));
        }
      }
      hideDeleteModal();
    });
  }

  if (deleteCancelBtn) {
    deleteCancelBtn.addEventListener("click", hideDeleteModal);
  }

  if (deleteModal) {
    deleteModal.addEventListener("click", (e: Event) => {
      if (e.target === deleteModal) hideDeleteModal();
    });
  }

  // Pagination delegation
  const pagination = document.getElementById("doc-grid-pagination");
  if (pagination) {
    pagination.addEventListener("click", (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("pagination-link")) return;
      const page = Number.parseInt(target.dataset.page || "", 10);
      if (!Number.isFinite(page) || page < 1) return;
      void loadDocuments(page);
    });
  }

  // API Key buttons (placeholder - no backend yet)
  const createApiKeyBtn = document.getElementById("create-api-key-btn");
  if (createApiKeyBtn) {
    createApiKeyBtn.addEventListener("click", () => {
      // Generate a placeholder key for UI demonstration
      const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
      let key = "shtml_";
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      for (let i = 0; i < 24; i++) key += chars[bytes[i] % chars.length];
      showApiKeyModal(key);
    });
  }

  const apiKeyCopyBtn = document.getElementById("api-key-copy-btn");
  if (apiKeyCopyBtn) {
    apiKeyCopyBtn.addEventListener("click", () => {
      const value = document.getElementById("api-key-value");
      if (value?.textContent) {
        navigator.clipboard.writeText(value.textContent).then(() => {
          if (apiKeyCopyBtn) apiKeyCopyBtn.textContent = "Copied!";
          setTimeout(() => {
            if (apiKeyCopyBtn) apiKeyCopyBtn.textContent = "Copy";
          }, 1500);
        });
      }
    });
  }

  const apiKeyCloseBtn = document.getElementById("api-key-close-btn");
  if (apiKeyCloseBtn) {
    apiKeyCloseBtn.addEventListener("click", hideApiKeyModal);
  }

  const apiKeyModal = document.getElementById("api-key-modal");
  if (apiKeyModal) {
    apiKeyModal.addEventListener("click", (e: Event) => {
      if (e.target === apiKeyModal) hideApiKeyModal();
    });
  }

  // Clerk
  initClerkUserButton();
}

initDashboard();
