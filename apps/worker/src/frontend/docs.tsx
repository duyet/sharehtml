/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { raw } from "hono/utils/html";
import type { AssetUrls } from "../utils/assets.js";
import { toHtml } from "./jsx.js";

interface DocsParams {
  assets: AssetUrls;
}

export function DocsView({ assets }: DocsParams): string {
  const jsx = (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Docs — sharehtml</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {assets.docsCss && <link rel="stylesheet" href={assets.docsCss} />}
      </head>
      <body>
        <div class="docs-topbar">
          <a class="docs-topbar-home" href="/">
            sharehtml
          </a>
          <span class="docs-topbar-title">Documentation</span>
        </div>

        <div class="docs-layout">
          <aside class="docs-toc">
            <div class="docs-toc-title">Contents</div>
            <ul class="docs-toc-list">
              <li class="docs-toc-item">
                <a class="docs-toc-link" href="#what-is-sharehtml">What is sharehtml?</a>
              </li>
              <li class="docs-toc-item">
                <a class="docs-toc-link" href="#quick-start">Quick Start</a>
              </li>
              <li class="docs-toc-item">
                <a class="docs-toc-link" href="#for-users">For Users</a>
              </li>
              <li class="docs-toc-item">
                <a class="docs-toc-link" href="#for-ai-agents">For AI Agents</a>
              </li>
              <li class="docs-toc-item">
                <a class="docs-toc-link" href="#faq">FAQ</a>
              </li>
            </ul>
          </aside>

          <main class="docs-content">
            <section class="docs-section" id="what-is-sharehtml">
              <h2 class="docs-section-title">What is sharehtml?</h2>
              <p>
                sharehtml is an instant publishing platform for HTML, Markdown, and code files.
                Deploy reports, notes, snippets, and prototypes in seconds. Built specifically for
                AI agents and developers.
              </p>
              <p>
                Documents are shareable via link, support real-time collaboration, and render
                beautifully with syntax highlighting and proper typography.
              </p>
            </section>

            <section class="docs-section" id="quick-start">
              <h2 class="docs-section-title">Quick Start</h2>
              <p>Install the CLI and deploy any file:</p>
              <pre><code>npx -y @duyet/sharehtml@latest deploy path/to/file.html</code></pre>

              <h3 class="docs-section-subtitle">Authenticate (Optional)</h3>
              <p>
                For persistent documents and ownership, authenticate with your email:
              </p>
              <pre><code>npx -y @duyet/sharehtml@latest login</code></pre>
              <p>
                Without authentication, documents are anonymous and expire after 24 hours.
              </p>

              <h3 class="docs-section-subtitle">Deploy from AI Agents</h3>
              <p>
                Add sharehtml skills to your AI agent (Claude Code, Cursor, Windsurf, etc.):
              </p>
              <pre><code>npx -y skills@latest add duyet/sharehtml</code></pre>
              <p>
                Or paste this prompt to your AI agent:
              </p>
              <div class="docs-highlight-box">
                <p>
                  <em>"Deploy this to the web using sharehtml: `npx -y @duyet/sharehtml@latest deploy path/to/file.html`"</em>
                </p>
              </div>
            </section>

            <section class="docs-section" id="for-users">
              <h2 class="docs-section-title">For Users</h2>

              <h3 class="docs-section-subtitle">Viewing Documents</h3>
              <p>
                Anyone with a document link can view it. No account required. Documents render
                with proper HTML structure, syntax highlighting for code, and responsive layout.
              </p>

              <h3 class="docs-section-subtitle">Commenting</h3>
              <p>
                Select any text in a document to add a comment. Other viewers can see and reply
                to comments in real-time.
              </p>

              <h3 class="docs-section-subtitle">Sharing</h3>
              <p>
                Use the share button to copy the document link. You can control who can access:
              </p>
              <ul>
                <li><strong>Only me:</strong> Private, only you can view</li>
                <li><strong>Anyone with link:</strong> Public link, no authentication required</li>
                <li><strong>Specific people:</strong> Only verified email addresses can access</li>
              </ul>

              <h3 class="docs-section-subtitle">Export</h3>
              <p>
                Download documents as raw HTML, Markdown, or JSON using the export buttons in
                the top bar.
              </p>
            </section>

            <section class="docs-section" id="for-ai-agents">
              <h2 class="docs-section-title">For AI Agents</h2>

              <h3 class="docs-section-subtitle">Integration</h3>
              <p>
                AI agents can deploy to sharehtml via HTTP API or CLI. The CLI is the simplest
                method:
              </p>
              <pre><code>npx -y @duyet/sharehtml@latest deploy &#123;filename&#125;</code></pre>

              <h3 class="docs-section-subtitle">Authentication</h3>
              <p>
                Agents can deploy anonymously (documents expire after 24h) or with credentials
                for persistent storage. Use environment variables:
              </p>
              <pre><code>export SHAREHTML_EMAIL="your-email@example.com"
export SHAREHTML_API_KEY="your-api-key"
npx @duyet/sharehtml deploy &#123;filename&#125;</code></pre>

              <h3 class="docs-section-subtitle">LLM Discovery</h3>
              <p>
                The <code>/llms.txt</code> endpoint provides a machine-readable index of public
                documents for AI discovery.
              </p>

              <h3 class="docs-section-subtitle">Skills & Prompts</h3>
              <p>
                Install the sharehtml skill for seamless agent integration:
              </p>
              <pre><code>npx -y skills@latest add duyet/sharehtml</code></pre>
              <p>
                Skills include built-in prompts for Claude Code, Cursor, Windsurf, and other
                AI coding environments.
              </p>
            </section>

            <section class="docs-section" id="faq">
              <h2 class="docs-section-title">FAQ</h2>

              <h3 class="docs-section-subtitle">What file types are supported?</h3>
              <p>
                HTML, Markdown (.md), and plain text files. Code files are syntax-highlighted
                automatically.
              </p>

              <div class="docs-divider"></div>

              <h3 class="docs-section-subtitle">Do documents expire?</h3>
              <p>
                Anonymous documents expire after 24 hours. Authenticated documents persist
                indefinitely.
              </p>

              <div class="docs-divider"></div>

              <h3 class="docs-section-subtitle">Is it free?</h3>
              <p>
                Yes. Anonymous usage is free with 24-hour expiry. Authenticated accounts get
                persistent storage at no cost.
              </p>

              <div class="docs-divider"></div>

              <h3 class="docs-section-subtitle">Can I use my own domain?</h3>
              <p>
                Not yet. Custom domain support is planned for future releases.
              </p>

              <div class="docs-divider"></div>

              <h3 class="docs-section-subtitle">How is this different from Vercel/Netlify?</h3>
              <p>
                sharehtml is designed for AI agents and rapid prototyping. No build steps,
                no configuration—just deploy any file instantly. It's for sharing work in
                progress, not production hosting.
              </p>

              <div class="docs-divider"></div>

              <h3 class="docs-section-subtitle">Is my document public?</h3>
              <p>
                By default, anyone with the link can view. You can restrict access to specific
                emails or make it private. Search engines do not index documents.
              </p>

              <div class="docs-divider"></div>

              <h3 class="docs-section-subtitle">Can I delete documents?</h3>
              <p>
                Yes, document owners can delete their documents from the share interface.
              </p>
            </section>
          </main>
        </div>

        <script>
          {raw(`
            (function() {
              // Highlight active TOC link based on scroll position
              const sections = document.querySelectorAll('.docs-section[id]');
              const tocLinks = document.querySelectorAll('.docs-toc-link');

              function updateActiveLink() {
                let currentSection = '';
                sections.forEach(section => {
                  const rect = section.getBoundingClientRect();
                  if (rect.top <= 100) {
                    currentSection = section.id;
                  }
                });

                tocLinks.forEach(link => {
                  link.classList.remove('active');
                  if (link.getAttribute('href') === '#' + currentSection) {
                    link.classList.add('active');
                  }
                });
              }

              window.addEventListener('scroll', updateActiveLink);
              updateActiveLink();
            })();
          `)}
        </script>
      </body>
    </html>
  );
  return toHtml(jsx);
}
