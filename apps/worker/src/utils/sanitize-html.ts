const UNSAFE_URI = /^(javascript:|vbscript:|data:text\/html)/i;
const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "xlink:href"]);

export const USER_LINK_REL = "nofollow ugc noopener noreferrer";

// Browsers decode entities and drop ASCII whitespace/control chars before
// reading the scheme, so "java&#x09;script:" must be caught too.
function normalizeUri(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&(tab|newline|colon);/gi, (_, name: string) =>
      name.toLowerCase() === "colon" ? ":" : "",
    )
    .replace(/[\u0000- ]/g, "");
}

export function isUnsafeUri(value: string): boolean {
  return UNSAFE_URI.test(normalizeUri(value));
}

const remover = {
  element(element: { remove(): void }) {
    element.remove();
  },
};

const attributeSanitizer = {
  element(element: {
    attributes: IterableIterator<[string, string]>;
    removeAttribute(name: string): void;
    setAttribute(name: string, value: string): void;
  }) {
    const removals: string[] = [];
    const rewrites: [string, string][] = [];
    for (const [name, value] of element.attributes) {
      const lower = name.toLowerCase();
      if (lower.startsWith("on")) {
        removals.push(name);
        continue;
      }
      if (URL_ATTRIBUTES.has(lower) && isUnsafeUri(value)) {
        rewrites.push([name, "#"]);
      }
    }
    for (const name of removals) {
      element.removeAttribute(name);
    }
    for (const [name, value] of rewrites) {
      element.setAttribute(name, value);
    }
  },
};

// Outbound links from user content must pass no ranking signal and no
// referrer. In-page anchors stay as they are.
const linkHardener = {
  element(element: { getAttribute(name: string): string | null; setAttribute(name: string, value: string): void }) {
    const href = element.getAttribute("href");
    if (href === null || href.trim().startsWith("#")) return;
    element.setAttribute("rel", USER_LINK_REL);
    element.setAttribute("target", "_blank");
    element.setAttribute("referrerpolicy", "no-referrer");
  },
};

const PRIVACY_META = '<meta name="referrer" content="no-referrer"><meta name="robots" content="noindex, nofollow">';

/**
 * Hardens uploader HTML before it is served, either into the sandboxed viewer
 * iframe or as the raw /d/:id.html page. This is defense in depth on top of
 * the iframe sandbox attribute and the raw page CSP.
 *
 * - Removes <script>, <base>, and <meta http-equiv> (refresh redirects).
 * - Removes on* handler attributes.
 * - Neutralizes javascript:, vbscript: and data:text/html in URL attributes.
 * - Rewrites <a>/<area> links to rel="nofollow ugc noopener noreferrer"
 *   target="_blank".
 * - Injects no-referrer and noindex meta tags.
 *
 * Streams through HTMLRewriter so the body is not buffered into memory.
 */
export function sanitizeDocumentStream(body: BodyInit): ReadableStream {
  let injected = false;
  return new HTMLRewriter()
    .on("script", remover)
    .on("base", remover)
    .on("meta[http-equiv]", remover)
    .on("*", attributeSanitizer)
    .on("a[href], area[href]", linkHardener)
    .on("head", {
      element(element) {
        if (injected) return;
        injected = true;
        element.prepend(PRIVACY_META, { html: true });
      },
    })
    .onDocument({
      end(end) {
        if (!injected) end.append(PRIVACY_META, { html: true });
      },
    })
    .transform(new Response(body)).body as ReadableStream;
}
