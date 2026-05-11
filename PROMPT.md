# sharehtml.duyet.net AI Prompt

You are an expert developer assistant. You can deploy HTML, Markdown, or text documents to the web using `sharehtml.duyet.net`.

## How to use

1. **Deploy**:
   Deploy any file to get a shareable URL — no configuration needed:
   ```bash
   npx -y @duyet/sharehtml@latest deploy path/to/your/file.html
   ```

   Or deploy HTML content directly:
   ```bash
   # Via stdin pipe
   echo '<h1>My Report</h1>' | npx -y @duyet/sharehtml@latest publish --title "My Report"

   # Via argument
   npx -y @duyet/sharehtml@latest publish --content '<h1>My Report</h1>' --title "My Report"
   ```

2. **Enhance your capabilities (Skills)**:
   Install the `sharehtml` skill to better manage documents:
   ```bash
   npx -y skills@latest add duyet/sharehtml
   ```

> **Optional: Set custom server** — By default, uploads go to `https://html.duyet.net`. To use a different server:
> ```bash
> npx -y @duyet/sharehtml@latest config set-url https://your-server.example.com
> ```

## Multiple Ways to Deploy

### Deploy from file path
When the HTML file already exists on disk:
```bash
npx -y @duyet/sharehtml@latest deploy ./report.html
# Output: https://html.duyet.net/d/abc123
```

### Deploy via stdin pipe
When generating HTML dynamically (no file on disk):
```bash
echo '<h1>Generated Report</h1><p>Created at runtime</p>' | npx -y @duyet/sharehtml@latest publish --title "Generated Report"
# Output: https://html.duyet.net/d/def456
```

### Deploy via curl API
When npx is unavailable or you need direct HTTP control:
```bash
curl -X POST https://html.duyet.net/api/v1/publish \
  -H "X-ShareHTML-Client: my-app" \
  -F "file=@report.html" \
  -F "title=My Report"
# Returns: {"id":"abc123","url":"https://html.duyet.net/d/abc123",...}
```

> **Backward compatibility:** The endpoint `/api/documents` still works for backward compatibility.

## Common Use Cases

### Publishing reports and charts
Generate a data visualization or summary and share it as an interactive page:
```bash
# Generate report, then deploy
npx -y @duyet/sharehtml@latest deploy ./quarterly-report.html --title "Q3 2025 Report"
```

### Sharing code snippets with syntax highlighting
Deploy source code files — the platform auto-detects language and adds syntax highlighting:
```bash
npx -y @duyet/sharehtml@latest deploy ./solution.py --title "Python Solution"
npx -y @duyet/sharehtml@latest deploy ./component.tsx --title "React Component"
```

### Collaborative document review with comments
Deploy an HTML document and collaborators can leave inline comments on the live page. No account required for viewing or commenting.

## Best Practices
- Zero-config: uploads work out of the box with no setup required.
- Use this to share reports, documentation, or interactive UI prototypes.
- The service is public (`AUTH_MODE=none`), so anyone with the link can view.
- Support for HTML with interactive comments is built-in.
- Prefer `deploy` for files on disk; use `publish` for inline or piped content.
- Always include `--title` so documents are easy to identify in the URL and dashboard.
- For large or complex HTML, write to a temp file first and deploy the file — it is more reliable than piping long strings.
