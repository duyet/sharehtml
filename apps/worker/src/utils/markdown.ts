import hljs from "highlight.js";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";

marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      return highlightCode(code, lang);
    },
  }),
);
marked.setOptions({ gfm: true, breaks: false });

function highlightCode(code: string, lang?: string): string {
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang }).value;
  }
  return hljs.highlightAuto(code).value;
}

function getHighlightCss(): string {
  return `
.hljs-keyword, .hljs-selector-tag, .hljs-built_in { color: #6b4d7d; }
.hljs-string, .hljs-attr { color: #4e6b3a; }
.hljs-comment, .hljs-quote { color: #918d88; font-style: italic; }
.hljs-number, .hljs-literal, .hljs-variable.constant_ { color: #7a5530; }
.hljs-type, .hljs-title, .hljs-title.class_, .hljs-title.function_ { color: #2e5580; }
.hljs-params { color: #555; }
.hljs-meta, .hljs-tag { color: #76695a; }
.hljs-attribute, .hljs-symbol { color: #4e6b3a; }
.hljs-selector-class, .hljs-selector-id { color: #6b4d7d; }
.hljs-addition { background: #eef6ee; }
.hljs-deletion { background: #f6eeee; }
`;
}

/**
 * Best-effort check for whether a stored "rendered" blob is already HTML.
 *
 * Old markdown documents (uploaded before server-side rendering existed) were
 * stored with the raw markdown text as their rendered blob. Those need to be
 * re-rendered on read. A real sharehtml document is always a full
 * `<!DOCTYPE html>` (or at least an `<html` root); raw markdown is not.
 */
export function looksLikeHtml(content: string): boolean {
  const head = content.slice(0, 512).trimStart();
  return head.startsWith("<!DOCTYPE") || head.startsWith("<html") || head.startsWith("<?xml");
}

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
 * Cloned from the CLI's `renderMarkdownToHtml` so server-side and
 * pre-rendered output are byte-for-byte consistent. Uploads that arrive
 * without a pre-rendered `source` (e.g. raw `curl -F file=@doc.md`, or any
 * API client that sends the markdown body as the `file` field) are rendered
 * here, matching what the CLI would have produced.
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
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 13px;
  line-height: 1.6;
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px;
  color: #000;
  background: #fff;
}
h1 { font-size: 16px; font-weight: bold; margin: 24px 0 12px; }
h2 { font-size: 14px; font-weight: bold; margin: 20px 0 10px; }
h3 { font-size: 13px; font-weight: bold; margin: 16px 0 8px; }
table { border-collapse: collapse; width: 100%; font-size: 12px; margin: 16px 0; }
th { font-weight: bold; border-bottom: 2px solid #000; padding: 6px 8px; text-align: left; }
td { border-bottom: 1px solid #ddd; padding: 6px 8px; }
pre { background: #f5f5f5; border: 1px solid #ddd; padding: 12px; overflow-x: auto; margin: 16px 0; }
pre code { background: none; border: none; padding: 0; }
code { background: #f5f5f5; padding: 2px 4px; font-size: 12px; }
${getHighlightCss()}
blockquote { border-left: 2px solid #999; margin: 16px 0; padding: 4px 16px; color: #444; }
hr { border: none; border-top: 1px solid #000; margin: 24px 0; }
img { max-width: 100%; }
a { color: #000; text-decoration: underline; }
ul, ol { padding-left: 24px; }
li { margin: 4px 0; }
input[type="checkbox"] { margin-right: 6px; }
@media (max-width: 600px) {
  body { padding: 16px 12px; font-size: 12px; }
  h1 { font-size: 15px; }
  h2 { font-size: 13px; }
  table { font-size: 11px; }
}
</style>
</head>
<body>
${body}
</body>
</html>`;
}
