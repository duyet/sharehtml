import { Hono } from "hono";
import { isAuthEnabled, shareModeFromInt, type AppBindings, isSourceKind } from "../types.js";
import { ShellView } from "../frontend/shell.js";
import { getAssetUrls } from "../utils/assets.js";
import { createCapabilityToken } from "../utils/capability.js";
import { cspHeader } from "../utils/csp.js";
import { loadDocWithAccessCheck } from "../utils/document-access.js";
import { createAttachmentHeaders } from "../utils/download.js";
import { emailsMatch, normalizeEmail } from "../utils/email.js";
import { requireViewerBrowserCapability } from "../utils/request-security.js";
import { getRenderedObject, getSourceObject } from "../utils/document-storage.js";

function getSourceMimeType(kind: string): string {
  if (kind === "markdown") return "text/markdown; charset=utf-8";
  if (kind === "html") return "text/html; charset=utf-8";
  return "text/plain; charset=utf-8";
}

const CAPABILITY_TTL_SECONDS = 600;

const viewer = new Hono<AppBindings>();

// Viewer shell
viewer.get("/d/:id", async (c) => {
  const paramId = c.req.param("id");
  const isRawHtml = paramId.endsWith(".html");
  const id = isRawHtml ? paramId.slice(0, -5) : paramId;
  const email = normalizeEmail(c.get("authUser").email);

  const result = await loadDocWithAccessCheck(c.env, id, email);
  if (!result) return c.text("Not found", 404);
  const { doc, registry } = result;

  // Record view (don't block response, but ensure it completes)
  c.executionCtx.waitUntil(registry.recordView(email, id).catch(() => {}));

  if (isRawHtml) {
    const obj = await getRenderedObject(c.env.DOCUMENTS_BUCKET, id, doc);
    if (!obj) return c.text("Content not found", 404);

    return new Response(obj.body, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  const assets = await getAssetUrls(c.env.ASSETS);
  const viewerCapabilityToken = await createCapabilityToken(c.env, {
    scope: "viewer",
    email,
    documentId: id,
    ttlSeconds: CAPABILITY_TTL_SECONDS,
  });

  return c.html(
    ShellView({
      docId: id,
      title: doc.title,
      ownerEmail: doc.owner_email,
      email,
      authMode: c.env.AUTH_MODE,
      shareMode: shareModeFromInt(doc.is_shared),
      canManageSharing: isAuthEnabled(c.env.AUTH_MODE) && emailsMatch(doc.owner_email, email),
      assets,
      viewerCapabilityToken,
      clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
      cfBeaconToken: c.env.CF_BEACON_TOKEN,
    }),
    {
      headers: {
        "Content-Security-Policy": cspHeader({
          clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY,
          hasFrame: true,
        }),
      },
    },
  );
});

// Refresh a viewer capability token. The shell calls this before the current
// token expires so long-lived sessions keep working.
viewer.post("/d/:id/capability", async (c) => {
  const id = c.req.param("id");
  const email = normalizeEmail(c.get("authUser").email);

  const protectedResponse = await requireViewerBrowserCapability(c, id);
  if (protectedResponse) return protectedResponse;

  const result = await loadDocWithAccessCheck(c.env, id, email);
  if (!result) return c.text("Not found", 404);

  const token = await createCapabilityToken(c.env, {
    scope: "viewer",
    email,
    documentId: id,
    ttlSeconds: CAPABILITY_TTL_SECONDS,
  });
  return c.json({ token });
});

// Rendered document bytes. The shell fetches this and assigns iframe.srcdoc.
viewer.get("/d/:id/content", async (c) => {
  const id = c.req.param("id");
  const email = normalizeEmail(c.get("authUser").email);

  const protectedResponse = await requireViewerBrowserCapability(c, id, { responseType: "text" });
  if (protectedResponse) return protectedResponse;

  const result = await loadDocWithAccessCheck(c.env, id, email);
  if (!result) return c.text("Not found", 404);
  const { doc } = result;

  const obj = await getRenderedObject(c.env.DOCUMENTS_BUCKET, id, doc);

  if (!obj) {
    return c.text("Content not found", 404);
  }

  const renderedFilename = doc.rendered_filename || doc.filename;

  return new Response(obj.body, {
    headers: createAttachmentHeaders(renderedFilename, {
      "X-ShareHTML-Download-Content-Type": "text/html; charset=utf-8",
    }),
  });
});

// WebSocket proxy to Document DO
viewer.get("/d/:id/ws", async (c) => {
  const id = c.req.param("id");
  const email = normalizeEmail(c.get("authUser").email);

  const protectedResponse = await requireViewerBrowserCapability(c, id, {
    requireOrigin: true,
    responseType: "text",
    allowWebSocketProtocolCapability: true,
  });
  if (protectedResponse) return protectedResponse;

  const result = await loadDocWithAccessCheck(c.env, id, email);
  if (!result) return c.text("Not found", 404);

  const headers = new Headers(c.req.raw.headers);
  headers.set("X-Verified-Email", email);

  const docId = c.env.DOCUMENT_DO.idFromName(id);
  const docDo = c.env.DOCUMENT_DO.get(docId);
  return docDo.fetch(
    new Request(`http://do/${id}/ws`, { headers }),
  );
});

// Source document download
viewer.get("/d/:id/source", async (c) => {
  const id = c.req.param("id");
  const email = normalizeEmail(c.get("authUser").email);

  const result = await loadDocWithAccessCheck(c.env, id, email);
  if (!result) return c.text("Not found", 404);
  const { doc } = result;

  if (!doc.source_filename) {
    return c.text("Source not available", 404);
  }

  const obj = await getSourceObject(c.env.DOCUMENTS_BUCKET, id, doc);
  if (!obj) {
    return c.text("Source not found", 404);
  }

  const sourceKind = isSourceKind(doc.source_kind) ? doc.source_kind : "html";

  return new Response(obj.body, {
    headers: createAttachmentHeaders(doc.source_filename, {
      "Content-Type": getSourceMimeType(sourceKind),
      "Cache-Control": "public, max-age=0, must-revalidate",
    }),
  });
});

export { viewer };
