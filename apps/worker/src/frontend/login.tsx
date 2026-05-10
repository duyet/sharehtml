/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AssetUrls } from "../utils/assets.js";
import type { AuthMode } from "../types.js";
import { toHtml } from "./jsx.js";

interface LoginParams {
  assets: AssetUrls;
  redirectUrl?: string;
  authMode: AuthMode;
  clerkPublishableKey?: string;
}

export function LoginView({ assets, redirectUrl = "/", authMode, clerkPublishableKey }: LoginParams): string {
  const jsx = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sign in - sharehtml</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {assets.homeCss && <link rel="stylesheet" href={assets.homeCss} />}
        <style>{`
          .login-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: var(--ivory);
          }
          .login-logo {
            font-family: var(--font-serif);
            font-size: 42px;
            font-weight: 500;
            color: var(--slate);
            margin-bottom: 12px;
            letter-spacing: -0.02em;
          }
          .login-subtitle {
            color: var(--g700);
            margin-bottom: 32px;
            font-size: 16px;
          }
          .login-form {
            width: 100%;
            max-width: 400px;
            background: white;
            padding: 32px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .form-group {
            margin-bottom: 16px;
          }
          .form-label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: var(--slate);
          }
          .form-input {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--g200);
            border-radius: 6px;
            font-size: 16px;
            box-sizing: border-box;
          }
          .form-input:focus {
            outline: none;
            border-color: var(--slate);
          }
          .form-button {
            width: 100%;
            padding: 12px;
            background: var(--slate);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
          }
          .form-button:hover {
            background: var(--g900);
          }
          .form-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .form-error {
            color: #dc2626;
            font-size: 14px;
            margin-top: 8px;
          }
          .form-footer {
            margin-top: 24px;
            text-align: center;
            font-size: 14px;
            color: var(--g700);
          }
          .form-footer a {
            color: var(--slate);
            text-decoration: none;
          }
          .form-footer a:hover {
            text-decoration: underline;
          }
        `}</style>
      </head>
      <body>
        <div class="login-container">
          <div class="login-logo">sharehtml</div>
          <div class="login-subtitle">Sign in or create an account</div>
          <div class="login-form">
            <div id="auth-loading" style="text-align: center; color: var(--g700);">Loading...</div>
            <div id="auth-form" style="display: none;">
              <div class="form-group">
                <label class="form-label" for="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  class="form-input"
                  placeholder="you@example.com"
                  required
                  autocomplete="email"
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  class="form-input"
                  placeholder="Enter your password"
                  required
                  autocomplete="current-password"
                />
              </div>
              <div class="form-group">
                <button type="button" class="form-button" id="submit-btn">Sign in</button>
              </div>
              <div id="form-error" class="form-error" style="display: none;"></div>
              <div class="form-footer">
                <a href="/signup">Create an account</a>
              </div>
            </div>
            <div id="auth-success" style="display: none; text-align: center;">
              <p style="color: var(--g700); margin-bottom: 16px;">Signed in successfully!</p>
              <p><a href="/dashboard" class="topbar-link">Continue to dashboard</a></p>
            </div>
          </div>
        </div>
        <script>
          {raw(`
            window.__LOGIN_CONFIG__ = ${JSON.stringify({
              redirectUrl,
              clerkPublishableKey: authMode === "clerk" ? clerkPublishableKey : undefined,
            })};

            // Show form and setup sign-in handler
            (function() {
              console.log("Login script executing");

              // Show form immediately
              const loadingEl = document.getElementById("auth-loading");
              const formEl = document.getElementById("auth-form");
              if (loadingEl) loadingEl.style.display = "none";
              if (formEl) formEl.style.display = "block";

              // Sign-in handler (AJAX)
              async function handleSignIn() {
                console.log("handleSignIn: Called");

                const email = document.getElementById("email").value;
                const password = document.getElementById("password").value;
                const submitBtn = document.getElementById("submit-btn");
                const errorEl = document.getElementById("form-error");

                console.log("handleSignIn: Email:", email);

                if (!email || !password) {
                  if (errorEl) {
                    errorEl.textContent = "Please fill in all fields";
                    errorEl.style.display = "block";
                  }
                  return;
                }

                if (submitBtn) {
                  submitBtn.disabled = true;
                  submitBtn.textContent = "Signing in...";
                }
                if (errorEl) errorEl.style.display = "none";

                try {
                  console.log("handleSignIn: Sending request...");
                  const response = await fetch("/api/clerk/sign_in", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      email,
                      password,
                      clerkPublishableKey: window.__LOGIN_CONFIG__.clerkPublishableKey
                    }),
                  });

                  const data = await response.json();
                  console.log("handleSignIn: Response:", data);

                  if (!response.ok) {
                    throw new Error(data.error || "Sign in failed");
                  }

                  // Show success message
                  if (formEl) formEl.style.display = "none";
                  const successEl = document.getElementById("auth-success");
                  if (successEl) successEl.style.display = "block";

                  // Store token and redirect
                  if (data.token) {
                    localStorage.setItem("clerk_token", data.token);
                    setTimeout(() => {
                      window.location.href = window.__LOGIN_CONFIG__.redirectUrl || "/dashboard";
                    }, 1500);
                  }
                } catch (err) {
                  console.error("handleSignIn: Error:", err);
                  if (errorEl) {
                    errorEl.textContent = err.message || "Sign in failed";
                    errorEl.style.display = "block";
                  }
                  if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Sign in";
                  }
                }
              }

              // Attach button click handler
              function setupForm() {
                const submitBtn = document.getElementById("submit-btn");
                if (submitBtn) {
                  submitBtn.addEventListener("click", handleSignIn);
                  console.log("Click listener attached to button");
                }

                // Also handle Enter key in password field
                const passwordField = document.getElementById("password");
                if (passwordField) {
                  passwordField.addEventListener("keypress", (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSignIn();
                    }
                  });
                  console.log("Enter key listener attached to password field");
                }
              }

              if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", setupForm);
              } else {
                setupForm();
              }
            })();
          `)}
        </script>
        {assets.homeClientJs && <script type="module" src={assets.homeClientJs}></script>}
      </body>
    </html>
  );

  return toHtml(jsx);
}
