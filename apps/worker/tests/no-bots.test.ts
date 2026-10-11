import { env, exports } from "cloudflare:workers";
import { sanitizeDocumentStream } from "../src/utils/sanitize-html.js";

// Owner requirement: hosting HTML is dangerous. Hosted artifacts must not be
// crawled, must pass no SEO value through links, and must leak no referrer.

const DOC_ID = "nobots-doc";
const DOC_TITLE = "Secret Listing Title 7f3a";

let seeded: Promise<void> | null = null;
function seedDoc() {
  seeded ??= putDoc();
  return seeded;
}

async function putDoc() {
  const reg = env.REGISTRY_DO.get(env.REGISTRY_DO.idFromName("global"));
  await reg.createDocument({
    id: DOC_ID,
    title: DOC_TITLE,
    filename: "test.html",
    size: 100,
    owner_email: "dev@localhost",
    is_shared: 1,
  });
  await env.DOCUMENTS_BUCKET.put(
    `${DOC_ID}/test.html`,
    `<html><head><meta http-equiv="refresh" content="0;url=https://evil.example"><base href="https://evil.example/"></head>
     <body><a href="https://out.example">out</a><form action="javascript:alert(1)"></form></body></html>`,
    { httpMetadata: { contentType: "text/html" } },
  );
}

async function sanitize(html: string): Promise<string> {
  return new Response(sanitizeDocumentStream(html)).text();
}

function expectNoBotHeaders(res: Response) {
  expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive, nosnippet");
  expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
}

describe("no-crawler and no-referrer headers", () => {
  beforeEach(seedDoc);

  for (const path of ["/", `/d/${DOC_ID}`, `/d/${DOC_ID}.html`, "/llms.txt", "/robots.txt"]) {
    it(`sets headers on ${path}`, async () => {
      const res = await exports.default.fetch(`https://example.com${path}`);
      expect(res.status).toBe(200);
      expectNoBotHeaders(res);
      await res.text();
    });
  }

  it("robots.txt disallows everything", async () => {
    const res = await exports.default.fetch("https://example.com/robots.txt");
    expect(await res.text()).toBe("User-agent: *\nDisallow: /\n");
  });

  it("viewer shell asks robots not to index", async () => {
    const html = await (await exports.default.fetch(`https://example.com/d/${DOC_ID}`)).text();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"');
    expect(html).not.toContain('content="all"');
  });

  it("llms.txt is a usage guide and lists no documents", async () => {
    const body = await (await exports.default.fetch("https://example.com/llms.txt")).text();
    expect(body).not.toContain(DOC_TITLE);
    expect(body).not.toContain(`/d/${DOC_ID}`);
  });
});

describe("raw /d/:id.html", () => {
  beforeEach(seedDoc);

  it("CSP sandboxes the page and blocks forms, base and framing", async () => {
    const res = await exports.default.fetch(`https://example.com/d/${DOC_ID}.html`);
    const csp = res.headers.get("Content-Security-Policy") ?? "";
    for (const dir of ["default-src 'none'", "sandbox", "form-action 'none'", "base-uri 'none'", "frame-ancestors 'self'"]) {
      expect(csp).toContain(dir);
    }
    await res.text();
  });

  it("serves hardened HTML (no refresh redirect, no base, nofollow links)", async () => {
    const html = await (await exports.default.fetch(`https://example.com/d/${DOC_ID}.html`)).text();
    expect(html).not.toContain("http-equiv");
    expect(html).not.toContain("<base");
    expect(html).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(html).toContain('<meta name="referrer" content="no-referrer">');
    expect(html).not.toContain("javascript:");
  });
});

describe("shell CSP", () => {
  it("only allows same-origin framing", async () => {
    await seedDoc();
    const res = await exports.default.fetch(`https://example.com/d/${DOC_ID}`);
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
    await res.text();
  });
});

describe("sanitizeDocumentStream", () => {
  it("adds rel and target to external links and areas", async () => {
    const html = await sanitize('<a href="https://x.example" rel="dofollow">x</a><map><area href="/y"></map>');
    expect(html).toContain('<a href="https://x.example" rel="nofollow ugc noopener noreferrer" target="_blank"');
    expect(html).toMatch(/<area href="\/y" rel="nofollow ugc noopener noreferrer" target="_blank"/);
    expect(html).not.toContain("dofollow");
  });

  it("leaves in-page anchors untouched", async () => {
    const html = await sanitize('<a href="#intro">intro</a>');
    expect(html).toContain('<a href="#intro">intro</a>');
  });

  it("strips meta refresh and base", async () => {
    const html = await sanitize(
      '<head><meta http-equiv="refresh" content="0;url=https://evil.example"><base href="https://evil.example/"></head>',
    );
    expect(html).not.toContain("refresh");
    expect(html).not.toContain("<base");
  });

  it("injects the no-referrer meta into head, or at the end without one", async () => {
    expect(await sanitize("<html><head><title>t</title></head></html>")).toMatch(
      /<head><meta name="referrer" content="no-referrer">/,
    );
    expect(await sanitize("<p>hi</p>")).toContain('<meta name="referrer" content="no-referrer">');
  });

  it("neutralizes dangerous URIs in every URL attribute, including encoded ones", async () => {
    const html = await sanitize(
      [
        '<a href="java&#x09;script:alert(1)">a</a>',
        '<iframe src="data:text/html,<script>alert(1)</script>"></iframe>',
        '<form action="javascript:alert(1)"><button formaction="vbscript:x">b</button></form>',
        '<svg><a xlink:href="javascript:alert(1)">s</a></svg>',
      ].join(""),
    );
    expect(html).not.toMatch(/javascript|vbscript|data:text\/html/i);
    expect(html).not.toContain("&#x09;");
  });
});
