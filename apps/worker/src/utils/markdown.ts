import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render a Markdown string into a self-contained HTML document.
 *
 * The CLI pre-renders Markdown to HTML before upload, but uploads that arrive
 * without a pre-rendered `source` (e.g. raw `curl -F file=@doc.md`, or any
 * API client that sends the markdown body as the `file` field) must be rendered
 * server-side so the viewer shows styled HTML instead of raw text.
 */
export function renderMarkdownToHtml(markdown: string, title: string): string {
  const body = marked.parse(markdown, { async: false }) as string;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 16px;
  line-height: 1.65;
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 24px 96px;
  color: #1b1b1a;
  background: #fff;
  word-wrap: break-word;
}
h1, h2, h3, h4 { line-height: 1.25; margin: 1.6em 0 0.6em; font-weight: 600; }
h1 { font-size: 30px; }
h2 { font-size: 24px; border-bottom: 1px solid #ececec; padding-bottom: 0.3em; }
h3 { font-size: 20px; }
p { margin: 0.9em 0; }
a { color: #c2410c; text-decoration: none; }
a:hover { text-decoration: underline; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: #f5f5f4;
  padding: 0.15em 0.4em;
  border-radius: 4px;
}
pre { background: #f5f5f4; padding: 16px 18px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; font-size: 13.5px; }
blockquote {
  margin: 1em 0; padding: 0.2em 1em; border-left: 3px solid #d4d4d4; color: #555;
}
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 14px; }
th, td { border: 1px solid #e2e2e2; padding: 8px 10px; text-align: left; }
th { background: #fafafa; font-weight: 600; }
img { max-width: 100%; border-radius: 6px; }
hr { border: none; border-top: 1px solid #ececec; margin: 2em 0; }
ul, ol { padding-left: 1.6em; }
li { margin: 0.3em 0; }
input[type="checkbox"] { margin-right: 6px; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}
