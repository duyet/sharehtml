const JAVASCRIPT_URI = /^\s*javascript:/i;

const scriptRemover = {
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
      if ((lower === "href" || lower === "src") && JAVASCRIPT_URI.test(value)) {
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

/**
 * Strips executable script content from a document's rendered HTML so it
 * cannot run when served inside the sandboxed viewer iframe. This is defense
 * in depth on top of the iframe sandbox attribute.
 *
 * Removes <script> elements, inline event-handler attributes (on*), and
 * neutralizes javascript: href/src URLs. The first-party collaboration runtime
 * is injected by the client after this content is fetched, so it is unaffected.
 *
 * Streams through HTMLRewriter so the response body is transformed without
 * buffering it fully into memory.
 */
export function sanitizeDocumentStream(body: BodyInit): ReadableStream {
  return new HTMLRewriter()
    .on("script", scriptRemover)
    .on("*", attributeSanitizer)
    .transform(new Response(body)).body as ReadableStream;
}
