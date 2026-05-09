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
            <div class="docs-toc-title">On this page</div>
            <ul class="docs-toc-list">
              <li class="docs-toc-item"><a class="docs-toc-link" href="#tldr">TL;DR</a></li>
              <li class="docs-toc-item"><a class="docs-toc-link" href="#quick-start">Quick Start</a></li>
              <li class="docs-toc-item"><a class="docs-toc-link" href="#for-users">For Users</a></li>
              <li class="docs-toc-item"><a class="docs-toc-link" href="#for-ai-agents">For AI Agents</a></li>
              <li class="docs-toc-item"><a class="docs-toc-link" href="#api">API Reference</a></li>
              <li class="docs-toc-item"><a class="docs-toc-link" href="#faq">FAQ</a></li>
            </ul>
          </aside>

          <main class="docs-content">
            <header class="docs-header">
              <div class="docs-eyebrow">Documentation</div>
              <h1>Deploy files instantly with sharehtml</h1>
              <div class="docs-tldr" id="tldr">
                <b>TL;DR</b> — Deploy HTML, Markdown, or code files in seconds. No signup required.
                Anonymous documents expire after 24 hours; authenticate for persistent storage.
                Built for AI agents and developers.
              </div>
            </header>

            <section class="docs-section" id="quick-start">
              <h2 class="docs-section-title">Quick Start</h2>
              <p>The fastest way to deploy a file:</p>
              <pre><code>npx -y @duyet/sharehtml deploy path/to/file.html</code></pre>

              <div class="docs-callout">
                <span class="docs-callout-icon">★</span>
                <div>
                  <b>No signup required.</b> Deploy anonymously — your document will be live instantly.
                  Anonymous documents expire after 24 hours. Authenticate for permanent storage.
                </div>
              </div>

              <h3 class="docs-section-subtitle">Choose your workflow</h3>
              <p>Expand to see the setup for your use case:</p>

              <details open>
                <summary>
                  <span class="docs-summary-title">1 · Deploy as one-off file</span>
                  <span class="docs-summary-meta">npx • no install</span>
                </summary>
                <div class="docs-details-body">
                  <p>Use npx to deploy without installing anything:</p>
                  <pre><code>npx -y @duyet/sharehtml deploy report.html</code></pre>
                  <p>This uploads the file and returns a shareable URL. Works for HTML, Markdown, and text files.</p>
                </div>
              </details>

              <details>
                <summary>
                  <span class="docs-summary-title">2 · Install CLI for repeated use</span>
                  <span class="docs-summary-meta">npm • global install</span>
                </summary>
                <div class="docs-details-body">
                  <p>Install globally for faster deployments:</p>
                  <pre><code>npm install -g @duyet/sharehtml
sharehtml deploy report.html</code></pre>
                  <p>The CLI caches your credentials and supports all deployment options.</p>
                </div>
              </details>

              <details>
                <summary>
                  <span class="docs-summary-title">3 · Authenticate for persistent storage</span>
                  <span class="docs-summary-meta">email • permanent docs</span>
                </summary>
                <div class="docs-details-body">
                  <p>Link your email to keep documents permanently:</p>
                  <pre><code>npx -y @duyet/sharehtml login</code></pre>
                  <p>
                    You'll receive a verification link. Once verified, all your documents persist
                    indefinitely and you can manage them from your dashboard.
                  </p>
                </div>
              </details>

              <details>
                <summary>
                  <span class="docs-summary-title">4 · Use from AI agents</span>
                  <span class="docs-summary-meta">Claude • Cursor • Windsurf</span>
                </summary>
                <div class="docs-details-body">
                  <p>Add sharehtml skills to your AI agent:</p>
                  <pre><code>npx -y skills add duyet/sharehtml</code></pre>
                  <p>Or paste this prompt to your AI agent:</p>
                  <div class="docs-highlight-box">
                    <p>
                      <em>"Deploy this to the web using sharehtml: `npx -y @duyet/sharehtml deploy path/to/file.html`"</em>
                    </p>
                  </div>
                  <p>The agent will deploy files and return the live URL automatically.</p>
                </div>
              </details>
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
                to comments in real-time. Comments are stored per-document and persist with the document.
              </p>

              <h3 class="docs-section-subtitle">Sharing & Privacy</h3>
              <p>Use the share button to copy the document link. Access modes:</p>
              <ul>
                <li><b>Only me:</b> Private, only you can view</li>
                <li><b>Anyone with link:</b> Public link, no authentication required (default)</li>
                <li><b>Specific people:</b> Only verified email addresses can access</li>
              </ul>

              <div class="docs-callout">
                <span class="docs-callout-icon">★</span>
                <div>
                  <b>Search engines.</b> Documents are not indexed by search engines. Your content
                  is only accessible to those with the direct link.
                </div>
              </div>

              <h3 class="docs-section-subtitle">Export</h3>
              <p>
                Download documents as raw HTML, Markdown, or JSON using the export buttons in
                the top bar.
              </p>
            </section>

            <section class="docs-section" id="for-ai-agents">
              <h2 class="docs-section-title">For AI Agents</h2>

              <p>
                AI agents can deploy to sharehtml via CLI or HTTP API. The CLI is the simplest
                method and requires no authentication for anonymous deployments.
              </p>

              <h3 class="docs-section-subtitle">Anonymous Deployment</h3>
              <p>
                Agents can deploy without credentials. Documents expire after 24 hours:
              </p>
              <pre><code>npx -y @duyet/sharehtml deploy report.html</code></pre>

              <h3 class="docs-section-subtitle">Authenticated Deployment</h3>
              <p>
                For persistent storage, set credentials as environment variables:
              </p>

              <div class="docs-tabs" data-tabs="auth">
                <div class="docs-tabbar">
                  <button class="on" data-t="0">Environment</button>
                  <button data-t="1">CLI login</button>
                  <button data-t="2">.env file</button>
                </div>
                <pre class="on"><span class="docs-comment"># Set environment variables</span>
export SHAREHTML_EMAIL="you@example.com"
export SHAREHTML_API_KEY="your-api-key"
npx @duyet/sharehtml deploy report.html</pre>
                <pre><span class="docs-comment"># Login once, CLI caches credentials</span>
npx -y @duyet/sharehtml login
npx @duyet/sharehtml deploy report.html</pre>
                <pre><span class="docs-comment"># Or add to .env file</span>
SHAREHTML_EMAIL=you@example.com
SHAREHTML_API_KEY=your-api-key</pre>
              </div>

              <h3 class="docs-section-subtitle">LLM Discovery</h3>
              <p>
                The <code>/llms.txt</code> endpoint provides a machine-readable index of public
                documents for AI agents to discover.
              </p>

              <h3 class="docs-section-subtitle">Skills Integration</h3>
              <p>
                Install the sharehtml skill for seamless agent integration:
              </p>
              <pre><code>npx -y skills add duyet/sharehtml</code></pre>
              <p>
                Skills include built-in prompts for Claude Code, Cursor, Windsurf, and other
                AI coding environments. The agent will automatically deploy files when asked.
              </p>
            </section>

            <section class="docs-section" id="api">
              <h2 class="docs-section-title">API Reference</h2>

              <p>
                sharehtml provides a simple HTTP API for uploading and managing documents.
              </p>

              <div class="docs-tabs" data-tabs="api">
                <div class="docs-tabbar">
                  <button class="on" data-t="0">Upload document</button>
                  <button data-t="1">Get document</button>
                  <button data-t="2">Update share</button>
                </div>
                <pre class="on"><span class="docs-comment"># Upload a document</span>
curl -X POST https://html.duyet.net/api/documents \
  -H "Content-Type: text/html" \
  --data-binary @index.html</pre>
                <pre><span class="docs-comment"># Get document metadata</span>
curl https://html.duyet.net/api/documents/doc_abc123</pre>
                <pre><span class="docs-comment"># Update share settings</span>{raw(`
curl -X PUT https://html.duyet.net/api/documents/doc_abc123/share \
  -H "Content-Type: application/json" \
  -d '{"mode":"link"}'`)}</pre>
              </div>

              <h3 class="docs-section-subtitle">Response Format</h3>
              <pre>{raw(`{
  "id": "doc_abc123",
  "title": "My Document",
  "url": "https://html.duyet.net/d/doc_abc123",
  "created_at": "2025-01-15T10:30:00Z",
  "expires_at": "2025-01-16T10:30:00Z"
}`)}</pre>
            </section>

            <section class="docs-section" id="faq">
              <h2 class="docs-section-title">FAQ</h2>

              <dl class="docs-faq">
                <dt>What file types are supported?</dt>
                <dd>
                  HTML, Markdown (.md), and plain text files. Code files are syntax-highlighted
                  automatically based on file extension.
                </dd>

                <dt>Do documents expire?</dt>
                <dd>
                  Anonymous documents expire after 24 hours. Authenticated documents persist
                  indefinitely. Login with your email to keep documents permanently.
                </dd>

                <dt>Is it free?</dt>
                <dd>
                  Yes. Anonymous usage is free with 24-hour expiry. Authenticated accounts get
                  persistent storage at no cost.
                </dd>

                <dt>Can I use my own domain?</dt>
                <dd>
                  Not yet. Custom domain support is planned for future releases.
                </dd>

                <dt>How is this different from Vercel/Netlify?</dt>
                <dd>
                  sharehtml is designed for AI agents and rapid prototyping. No build steps,
                  no configuration—just deploy any file instantly. It's for sharing work in
                  progress, not production hosting.
                </dd>

                <dt>Is my document public?</dt>
                <dd>
                  By default, anyone with the link can view. You can restrict access to specific
                  emails or make it private. Search engines do not index documents.
                </dd>

                <dt>Can I delete documents?</dt>
                <dd>
                  Yes, document owners can delete their documents from the share interface or
                  via the API.
                </dd>

                <dt>What happens to my documents if I delete my account?</dt>
                <dd>
                  Documents are deleted 30 days after account deletion. You can export your
                  documents before deleting.
                </dd>
              </dl>
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

              // Tab switching
              document.querySelectorAll('[data-tabs]').forEach(tabBox => {
                const btns = tabBox.querySelectorAll('.docs-tabbar button');
                const panes = tabBox.querySelectorAll('pre');

                btns.forEach(btn => {
                  btn.addEventListener('click', () => {
                    const tabIndex = btn.dataset.t;
                    btns.forEach(b => b.classList.remove('on'));
                    panes.forEach(p => p.classList.remove('on'));
                    btn.classList.add('on');
                    if (panes[tabIndex]) {
                      panes[tabIndex].classList.add('on');
                    }
                  });
                });
              });
            })();
          `)}
        </script>
      </body>
    </html>
  );
  return toHtml(jsx);
}
