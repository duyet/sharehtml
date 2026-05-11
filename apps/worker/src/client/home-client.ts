import "./home.css";

import { BROWSER_CAPABILITY_HEADER } from "../utils/security-constants.js";
import { isRecord } from "../types.js";
import {
  buildHomePath,
  formatDocumentSize,
  formatDocumentsResultsLabel,
  formatRelativeTime,
} from "../utils/home-view.js";

interface HomeDocumentSummary {
  id: string;
  title: string;
  filename: string;
  size: number;
  created_at: string;
}

interface HomeDocumentsResponse {
  documents?: HomeDocumentSummary[];
  totalCount?: number;
  page?: number;
  query?: string;
}

interface HomeClientConfig {
  page: number;
  pageSize: number;
  homeCapabilityToken: string;
  requiresLogin?: boolean;
  clerkPublishableKey?: string;
}

interface HomeClientElements {
  form: HTMLFormElement;
  input: HTMLInputElement;
  list: HTMLDivElement;
  pagination: HTMLDivElement;
  meta: HTMLDivElement;
  setupTemplate: HTMLTemplateElement;
}

function parseHomeDocumentSummary(value: unknown): HomeDocumentSummary | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;
  if (typeof value.title !== "string") return null;
  if (typeof value.filename !== "string") return null;
  if (typeof value.size !== "number" || !Number.isFinite(value.size)) return null;
  if (typeof value.created_at !== "string") return null;

  return {
    id: value.id,
    title: value.title,
    filename: value.filename,
    size: value.size,
    created_at: value.created_at,
  };
}

function parseHomeDocumentsResponse(value: unknown): HomeDocumentsResponse | null {
  if (!isRecord(value)) return null;
  if ("page" in value && value.page !== undefined && typeof value.page !== "number") return null;
  if (
    "totalCount" in value && value.totalCount !== undefined &&
    typeof value.totalCount !== "number"
  ) {
    return null;
  }
  if ("query" in value && value.query !== undefined && typeof value.query !== "string") return null;
  if ("documents" in value && value.documents !== undefined && !Array.isArray(value.documents)) return null;

  const documents: HomeDocumentSummary[] = [];
  if (Array.isArray(value.documents)) {
    for (const document of value.documents) {
      const parsed = parseHomeDocumentSummary(document);
      if (!parsed) return null;
      documents.push(parsed);
    }
  }

  return {
    documents,
    totalCount: typeof value.totalCount === "number" ? value.totalCount : undefined,
    page: typeof value.page === "number" ? value.page : undefined,
    query: typeof value.query === "string" ? value.query : undefined,
  };
}

function getHomeClientConfig(): HomeClientConfig | null {
  const config = Reflect.get(window, "__HOME_CONFIG__");
  if (!isRecord(config)) return null;
  if (typeof config.page !== "number" || !Number.isFinite(config.page)) return null;
  if (typeof config.pageSize !== "number" || !Number.isFinite(config.pageSize)) return null;
  if (typeof config.homeCapabilityToken !== "string" || config.homeCapabilityToken.length === 0) {
    return null;
  }

  return {
    page: config.page,
    pageSize: config.pageSize,
    homeCapabilityToken: config.homeCapabilityToken,
    requiresLogin: typeof config.requiresLogin === "boolean" ? config.requiresLogin : undefined,
    clerkPublishableKey: typeof config.clerkPublishableKey === "string" ? config.clerkPublishableKey : undefined,
  };
}

function getHomeClientElements(): HomeClientElements | null {
  const form = document.querySelector(".docs-search-form");
  const input = document.querySelector(".docs-search-input");
  const list = document.getElementById("documents-list");
  const pagination = document.getElementById("documents-pagination");
  const meta = document.getElementById("documents-meta");
  const setupTemplate = document.getElementById("documents-setup-template");

  console.log("getHomeClientElements:", {
    form: form?.constructor.name,
    input: input?.constructor.name,
    list: list?.constructor.name,
    pagination: pagination?.constructor.name,
    meta: meta?.constructor.name,
    setupTemplate: setupTemplate?.constructor.name
  });

  if (!(form instanceof HTMLFormElement)) {
    console.log("getHomeClientElements: form not found or not HTMLFormElement");
    return null;
  }
  if (!(input instanceof HTMLInputElement)) {
    console.log("getHomeClientElements: input not found or not HTMLInputElement");
    return null;
  }
  if (!(list instanceof HTMLDivElement)) {
    console.log("getHomeClientElements: list not found or not HTMLDivElement");
    return null;
  }
  if (!(pagination instanceof HTMLDivElement)) {
    console.log("getHomeClientElements: pagination not found or not HTMLDivElement");
    return null;
  }
  if (!(meta instanceof HTMLDivElement)) {
    console.log("getHomeClientElements: meta not found or not HTMLDivElement");
    return null;
  }
  if (!(setupTemplate instanceof HTMLTemplateElement)) {
    console.log("getHomeClientElements: setupTemplate not found or not HTMLTemplateElement");
    return null;
  }

  return { form, input, list, pagination, meta, setupTemplate };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHomeDocumentsList(
  list: HTMLDivElement,
  setupTemplate: HTMLTemplateElement,
  documents: HomeDocumentSummary[],
  query: string,
): void {
  if (documents.length > 0) {
    list.innerHTML = documents.map((doc) => `
      <a class="doc-card" href="/d/${escapeHtml(doc.id)}">
        <div class="doc-card-top">
          <span class="doc-card-title">${escapeHtml(doc.title)}</span>
          <span class="doc-card-filename">${escapeHtml(doc.filename)}</span>
        </div>
        <div class="doc-card-bottom">
          <span class="doc-card-meta">${formatDocumentSize(doc.size)}</span>
          <span class="doc-card-meta">${formatRelativeTime(doc.created_at)}</span>
        </div>
      </a>
    `).join("");
    return;
  }

  if (query) {
    list.innerHTML = `<div class="section-empty">no documents match "${escapeHtml(query)}"</div>`;
    return;
  }

  list.innerHTML = setupTemplate.innerHTML;
}

function renderHomePagination(
  pagination: HTMLDivElement,
  pageSize: number,
  totalCount: number,
  page: number,
  query: string,
): void {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0 || totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let previous = '<div class="docs-pagination-spacer"></div>';
  if (page > 1) {
    previous =
      `<a class="docs-pagination-link" href="${buildHomePath(query, page - 1)}" data-page="${page - 1}">previous</a>`;
  }

  let next = '<div class="docs-pagination-spacer"></div>';
  if (page < totalPages) {
    next =
      `<a class="docs-pagination-link" href="${buildHomePath(query, page + 1)}" data-page="${page + 1}">next</a>`;
  }

  pagination.innerHTML = `
    ${previous}
    <div class="docs-pagination-status">page ${page} of ${totalPages}</div>
    ${next}
  `;
}

function renderHomeMeta(meta: HTMLDivElement, totalCount: number, query: string): void {
  meta.textContent = formatDocumentsResultsLabel(totalCount, query);
}

function updateHomeUrl(query: string, page: number): void {
  window.history.replaceState({}, "", buildHomePath(query, page));
}

function initHomeClient(): void {
  console.log("initHomeClient: Starting initialization");

  // Check if on login page FIRST (before requiring config)
  if (document.getElementById("auth-form") || document.getElementById("clerk-sign-in")) {
    console.log("initHomeClient: On login page, calling initClerkSignIn");
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => void initClerkSignIn());
    } else {
      void initClerkSignIn();
    }
    return;
  }

  // Get config for non-login pages
  const config = getHomeClientConfig();
  if (!config) {
    console.log("initHomeClient: No config found");
    return;
  }
  console.log("initHomeClient: Config found", config);

  // Initialize Clerk user button
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void initClerkUserButton(config.requiresLogin ?? false));
  } else {
    void initClerkUserButton(config.requiresLogin ?? false);
  }

  // Try to get home client elements (may be null on pages without search forms)
  const elements = getHomeClientElements();
  if (!elements) {
    console.log("initHomeClient: No home elements found, skipping home initialization");
    return;
  }

  const { form, input, list, pagination, meta, setupTemplate } = elements;

  let timer = 0;
  let requestId = 0;
  let currentQuery = input.value.trim();

  async function loadDocuments(query: string, page: number): Promise<void> {
    const nextRequestId = ++requestId;
    const searchParams = new URLSearchParams();
    if (query) searchParams.set("q", query);
    searchParams.set("page", String(page));
    searchParams.set("limit", String(config.pageSize));

    const response = await fetch(`/api/documents?${searchParams.toString()}`, {
      headers: {
        Accept: "application/json",
        [BROWSER_CAPABILITY_HEADER]: config.homeCapabilityToken,
      },
    });
    if (!response.ok) return;

    const data = parseHomeDocumentsResponse(await response.json());
    if (!data) return;
    if (nextRequestId !== requestId) return;

    currentQuery = data.query || "";
    const nextPage = data.page || 1;
    renderHomeDocumentsList(list, setupTemplate, data.documents || [], currentQuery);
    renderHomePagination(pagination, config.pageSize, data.totalCount || 0, nextPage, currentQuery);
    renderHomeMeta(meta, data.totalCount || 0, currentQuery);
    updateHomeUrl(currentQuery, nextPage);
  }

  function submitSearch(): void {
    const nextValue = input.value.trim();
    if (nextValue === currentQuery) return;
    void loadDocuments(nextValue, 1);
  }

  function handleSearchInput(): void {
    window.clearTimeout(timer);
    timer = window.setTimeout(submitSearch, 120);
  }

  function handleSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    window.clearTimeout(timer);
    submitSearch();
  }

  function handleSearchSubmit(event: Event): void {
    event.preventDefault();
    window.clearTimeout(timer);
    submitSearch();
  }

  function handlePaginationClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const link = target.closest("[data-page]");
    if (!(link instanceof HTMLAnchorElement)) return;

    const page = Number.parseInt(link.dataset.page || "", 10);
    if (!Number.isFinite(page) || page < 1) return;

    event.preventDefault();
    void loadDocuments(currentQuery, page);
  }

  input.addEventListener("input", handleSearchInput);
  input.addEventListener("keydown", handleSearchKeydown);
  form.addEventListener("submit", handleSearchSubmit);
  pagination.addEventListener("click", handlePaginationClick);

  // Initialize tabs
  initTabs();

  // Check if on login page
  if (document.getElementById("auth-form") || document.getElementById("clerk-sign-in")) {
    console.log("initHomeClient: On login page, calling initClerkSignIn");
    // Wait for DOM ready before initializing Clerk sign-in
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => void initClerkSignIn());
    } else {
      void initClerkSignIn();
    }
    return;
  }

  console.log("initHomeClient: Not on login page, initializing Clerk user button");
  const userBtn = document.getElementById("clerk-user-btn");
  if (userBtn) userBtn.textContent = "JS-3";

  // Clerk user button initialization
  // Always show Sign in button for now
  if (document.readyState === "loading") {
    console.log("initHomeClient: Waiting for DOMContentLoaded");
    document.addEventListener("DOMContentLoaded", () => void initClerkUserButton(config.requiresLogin ?? false));
  } else {
    console.log("initHomeClient: DOM ready, calling initClerkUserButton");
    void initClerkUserButton(config.requiresLogin ?? false);
  }
}

async function initClerkSignIn(): Promise<void> {
  console.log("initClerkSignIn: Headless mode starting");

  const loginConfig = (window as unknown as Record<string, unknown>).__LOGIN_CONFIG__ as
    | { redirectUrl?: string; clerkPublishableKey?: string }
    | undefined;

  const clerkPublishableKey = loginConfig?.clerkPublishableKey;
  if (!clerkPublishableKey) {
    console.error("initClerkSignIn: No clerkPublishableKey");
    return;
  }

  // Show the form
  const loadingEl = document.getElementById("auth-loading");
  const formEl = document.getElementById("auth-form");
  const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
  const errorEl = document.getElementById("form-error");

  console.log("initClerkSignIn: Elements:", { loadingEl, formEl, submitBtn, errorEl });

  if (loadingEl) loadingEl.style.display = "none";
  if (formEl) {
    formEl.style.display = "block";
    console.log("initClerkSignIn: Form displayed");
  }

  // Handle sign-in button click (not form submit to avoid Enter key issues)
  submitBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("Sign-in button clicked");

    const email = (document.getElementById("email") as HTMLInputElement)?.value;
    const password = (document.getElementById("password") as HTMLInputElement)?.value;

    console.log("Form data:", { email, password: password ? "***" : "empty" });

    if (!email || !password) {
      if (errorEl) {
        errorEl.textContent = "Please fill in all fields";
        errorEl.style.display = "block";
      }
      return;
    }

    // Disable submit button
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in...";
    }
    if (errorEl) errorEl.style.display = "none";

    try {
      console.log("Sending sign-in request...");
      // Use Clerk's Backend API via our proxy endpoint
      const response = await fetch("/api/clerk/sign_in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, clerkPublishableKey }),
      });

      const data = await response.json();
      console.log("Sign-in response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Sign in failed");
      }

      // Show success message
      if (formEl) formEl.style.display = "none";
      const successEl = document.getElementById("auth-success");
      if (successEl) successEl.style.display = "block";

      // Store token and redirect after delay
      if (data.token) {
        localStorage.setItem("clerk_token", data.token);
        setTimeout(() => {
          window.location.href = loginConfig?.redirectUrl || "/dashboard";
        }, 1500);
      }
    } catch (err) {
      console.error("Sign in error:", err);
      if (errorEl) {
        errorEl.textContent = err instanceof Error ? err.message : "Sign in failed";
        errorEl.style.display = "block";
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign in";
      }
    }
  });

  // Also prevent Enter key from submitting form
  formEl?.addEventListener("submit", (e) => {
    e.preventDefault();
    console.log("Form submit prevented, clicking button instead");
    submitBtn?.click();
  });
}

async function initClerkUserButton(requiresLogin: boolean): Promise<void> {
  const node = document.getElementById("clerk-user-btn");
  if (!node) {
    console.log("clerk-user-btn element not found");
    return;
  }

  console.log("initClerkUserButton called, requiresLogin:", requiresLogin);

  const clerkConfig = (window as unknown as Record<string, unknown>).__HOME_CONFIG__ as
    | { clerkPublishableKey?: string }
    | undefined;

  const clerkPublishableKey = clerkConfig?.clerkPublishableKey;

  if (!clerkPublishableKey) {
    console.log("initClerkUserButton: No clerkPublishableKey in config");
    return;
  }

  // Load Clerk script dynamically
  const scriptUrl = "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6.8.0/dist/clerk.browser.js";

  // Check if script is already loaded
  if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Clerk"));
      document.head.appendChild(script);
    });
  }

  // Wait for window.Clerk to be available
  let Clerk = (window as unknown as Record<string, unknown>).Clerk as { new(key: string): unknown } | undefined;
  let attempts = 0;
  while (!Clerk && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    Clerk = (window as unknown as Record<string, unknown>).Clerk as { new(key: string): unknown } | undefined;
    attempts++;
  }

  if (!Clerk) {
    console.log("initClerkUserButton: Clerk not available after loading script");
    node.innerHTML = '<a href="/login" class="topbar-link">Sign in</a>';
    if (requiresLogin) {
      window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
    }
    return;
  }

  try {
    const clerk = new Clerk(clerkPublishableKey) as { load(): Promise<unknown>; user?: unknown; mountUserButton(el: HTMLElement, opts?: unknown): void; openSignIn(opts?: unknown): void };
    await clerk.load();

    // If user is authenticated, show user button
    if (clerk.user) {
      clerk.mountUserButton(node, {
        afterSignOutUrl: "/",
      });
      return;
    }

    // Show sign-in button that opens modal
    node.innerHTML = '<button class="topbar-link" style="background:none;border:none;color:inherit;cursor:pointer;font:inherit;padding:0;">Sign in</button>';

    const signInBtn = node.querySelector("button");
    signInBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      clerk.openSignIn({
        afterSignInUrl: window.location.pathname,
        afterSignUpUrl: window.location.pathname,
      });
    });

    // If this is a protected page and user is not authenticated, open sign-in
    if (requiresLogin && !clerk.user) {
      clerk.openSignIn({
        afterSignInUrl: window.location.pathname,
        afterSignUpUrl: window.location.pathname,
      });
    }
  } catch (err) {
    console.error("Clerk initialization error:", err);
    node.innerHTML = '<a href="/login" class="topbar-link">Sign in</a>';
    if (requiresLogin) {
      window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
    }
  }
}

function initTabs(): void {
  const tabs = document.querySelectorAll(".tabs");
  tabs.forEach((tab) => {
    const tabbar = tab.querySelector(".tabbar");
    if (!tabbar) return;

    const buttons = tabbar.querySelectorAll("button");
    const panes = tab.querySelectorAll("pre");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabIndex = btn.getAttribute("data-t");
        if (tabIndex === null) return;

        // Remove .on from all buttons and panes
        buttons.forEach((b) => b.classList.remove("on"));
        panes.forEach((p) => p.classList.remove("on"));

        // Add .on to clicked button and corresponding pane
        btn.classList.add("on");
        const targetPane = panes[Number.parseInt(tabIndex, 10)];
        if (targetPane) {
          targetPane.classList.add("on");
        }
      });
    });
  });
}

initHomeClient();
// force rebuild
