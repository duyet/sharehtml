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
  const isClerk = authMode === "clerk" && clerkPublishableKey;
  const jsx = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sign in - sharehtml</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {assets.homeCss && <link rel="stylesheet" href={assets.homeCss} />}
        {isClerk && <ClerkScripts publishableKey={clerkPublishableKey} />}
        <style>{`
          body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--ivory);
            font-family: var(--font-sans);
          }
          #clerk-sign-in {
            width: 100%;
            max-width: 400px;
          }
        `}</style>
      </head>
      <body>
        <div id="clerk-sign-in"></div>
        <script>
          {raw(`
            window.__LOGIN_CONFIG__ = ${JSON.stringify({ redirectUrl })};

            (async function() {
              if (!window.Clerk) {
                console.error("Clerk not loaded");
                return;
              }

              const clerk = new window.Clerk("${clerkPublishableKey}");
              await clerk.load();

              // Mount sign-in component
              clerk.mountSignIn(document.getElementById("clerk-sign-in"), {
                afterSignInUrl: window.__LOGIN_CONFIG__.redirectUrl,
                signUpUrl: "/signup"
              });
            })();
          `)}
        </script>
      </body>
    </html>
  );

  return toHtml(jsx);
}
