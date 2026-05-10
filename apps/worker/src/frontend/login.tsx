/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AssetUrls } from "../utils/assets.js";
import type { AuthMode } from "../types.js";
import { toHtml, ClerkScripts } from "./jsx.js";

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
          }
          .login-logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .login-subtitle {
            color: #666;
            margin-bottom: 32px;
          }
          .clerk-container {
            min-height: 400px;
          }
        `}</style>
        {authMode === "clerk" && clerkPublishableKey && (
          <ClerkScripts publishableKey={clerkPublishableKey} />
        )}
      </head>
      <body>
        <div class="login-container">
          <div class="login-logo">sharehtml</div>
          <div class="login-subtitle">Sign in or create an account</div>
          <div id="clerk-sign-in" class="clerk-container"></div>
        </div>
        <script>
          {raw(`
            window.__LOGIN_CONFIG__ = ${JSON.stringify({
              redirectUrl,
              clerkPublishableKey: authMode === "clerk" ? clerkPublishableKey : undefined,
            })};
          `)}
        </script>
        {assets.homeClientJs && <script type="module" src={assets.homeClientJs}></script>}
      </body>
    </html>
  );

  return toHtml(jsx);
}
