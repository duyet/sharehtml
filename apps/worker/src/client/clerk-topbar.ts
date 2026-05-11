/**
 * Canonical Clerk topbar mounting (follows the official JS CDN quickstart):
 *  - Waits for `window.load` so the deferred clerk.browser.js + ui.browser.js scripts are ready.
 *  - Calls `Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } })`.
 *  - If signed in: renders `[Dashboard link] [UserButton]`.
 *  - If signed out: renders a Sign in button that calls `Clerk.openSignIn()`.
 *  - `addListener` re-renders the topbar when auth state changes.
 *
 * The `data-clerk-publishable-key` attribute on the clerk.browser.js script tag
 * auto-instantiates the global `Clerk` instance, so we never call `new Clerk(...)`.
 */

interface ClerkUser {
  id: string;
}

interface ClerkInstance {
  isSignedIn?: boolean;
  user?: ClerkUser | null;
  load(opts?: unknown): Promise<unknown>;
  mountUserButton(node: HTMLElement, opts?: unknown): void;
  unmountUserButton?(node: HTMLElement): void;
  openSignIn(opts?: unknown): void;
  addListener(fn: (emission: { user?: ClerkUser | null }) => void): () => void;
}

interface ClerkWindow extends Window {
  Clerk?: ClerkInstance;
  __internal_ClerkUICtor?: unknown;
}

export interface SetupClerkTopbarOptions {
  /** Open the Clerk sign-in modal automatically when no user is present. */
  openSignInOnLoad?: boolean;
  /** Where to send users after sign in/out completes. Defaults to current pathname. */
  redirectUrl?: string;
}

export function setupClerkTopbar(opts: SetupClerkTopbarOptions = {}): void {
  const w = window as ClerkWindow;
  const onLoad = () => void renderTopbar(w, opts);
  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad, { once: true });
  }
}

async function renderTopbar(w: ClerkWindow, opts: SetupClerkTopbarOptions): Promise<void> {
  const node = document.getElementById("clerk-topbar");
  if (!node) return;

  const Clerk = await waitForClerk(w);
  if (!Clerk) {
    node.dataset.state = "error";
    node.innerHTML = '<a class="topbar-link" href="/">Sign in</a>';
    return;
  }

  try {
    await Clerk.load({
      ui: { ClerkUI: w.__internal_ClerkUICtor },
    });
  } catch {
    node.dataset.state = "error";
    node.innerHTML = '<a class="topbar-link" href="/">Sign in</a>';
    return;
  }

  const redirectUrl = opts.redirectUrl ?? window.location.pathname + window.location.search;

  const paint = () => paintTopbar(node, Clerk, redirectUrl);
  paint();
  Clerk.addListener(paint);

  if (opts.openSignInOnLoad && !Clerk.isSignedIn) {
    Clerk.openSignIn({
      fallbackRedirectUrl: redirectUrl,
      afterSignInUrl: redirectUrl,
      afterSignUpUrl: redirectUrl,
    });
  }
}

function paintTopbar(node: HTMLElement, Clerk: ClerkInstance, redirectUrl: string): void {
  node.innerHTML = "";
  if (Clerk.isSignedIn) {
    node.dataset.state = "signed-in";

    const dashboardLink = document.createElement("a");
    dashboardLink.className = "topbar-link";
    dashboardLink.href = "/dashboard";
    dashboardLink.textContent = "Dashboard";
    node.appendChild(dashboardLink);

    const buttonMount = document.createElement("span");
    buttonMount.className = "clerk-user-button";
    node.appendChild(buttonMount);
    Clerk.mountUserButton(buttonMount, { afterSignOutUrl: "/" });
    return;
  }

  node.dataset.state = "signed-out";
  const signInBtn = document.createElement("button");
  signInBtn.type = "button";
  signInBtn.className = "topbar-link topbar-link--button";
  signInBtn.textContent = "Sign in";
  signInBtn.addEventListener("click", () => {
    Clerk.openSignIn({
      fallbackRedirectUrl: redirectUrl,
      afterSignInUrl: redirectUrl,
      afterSignUpUrl: redirectUrl,
    });
  });
  node.appendChild(signInBtn);
}

async function waitForClerk(w: ClerkWindow): Promise<ClerkInstance | null> {
  if (w.Clerk) return w.Clerk;
  // The script tags are `defer`, so after `window.load` Clerk is normally ready.
  // A tiny grace period covers Safari ordering quirks.
  for (let i = 0; i < 40; i++) {
    if (w.Clerk) return w.Clerk;
    await new Promise((r) => setTimeout(r, 50));
  }
  return w.Clerk ?? null;
}
