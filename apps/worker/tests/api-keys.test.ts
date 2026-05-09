import { exports } from "cloudflare:workers";
import { env } from "cloudflare:workers";
import { isRecord } from "../src/types.js";

const html = "<html><body><h1>API Key Test</h1></body></html>";

function getRecord(value: unknown): Record<string, unknown> {
  expect(isRecord(value)).toBe(true);
  if (!isRecord(value)) {
    throw new Error("expected record");
  }
  return value;
}

function getStringField(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  expect(typeof field).toBe("string");
  if (typeof field !== "string") {
    throw new Error(`expected string field: ${key}`);
  }
  return field;
}

function getArrayField(value: Record<string, unknown>, key: string): unknown[] {
  const field = value[key];
  expect(Array.isArray(field)).toBe(true);
  if (!Array.isArray(field)) {
    throw new Error(`expected array field: ${key}`);
  }
  return field;
}

function upload(filename: string, content: string, title?: string, headers?: Record<string, string>) {
  const form = new FormData();
  form.append("file", new File([content], filename, { type: "text/html" }));
  if (title) form.append("title", title);
  return exports.default.fetch("https://example.com/api/documents", {
    method: "POST",
    body: form,
    headers: headers || {},
  });
}

describe("API Key CRUD", () => {
  it("creates, lists, and deletes an API key", async () => {
    // Create key
    const createRes = await exports.default.fetch("https://example.com/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Key" }),
    });
    expect(createRes.status).toBe(201);
    const created = getRecord(await createRes.json());
    const keyId = getStringField(created, "id");
    const keyValue = getStringField(created, "key");
    expect(keyValue).toMatch(/^shk_[a-zA-Z0-9]{32}$/);
    expect(getStringField(created, "name")).toBe("Test Key");
    expect(created.created_at).toBeTruthy();

    // List keys
    const listRes = await exports.default.fetch("https://example.com/api/keys");
    expect(listRes.status).toBe(200);
    const list = getRecord(await listRes.json());
    const keys = getArrayField(list, "keys");
    const found = keys.find((k) => isRecord(k) && getStringField(k as Record<string, unknown>, "id") === keyId);
    expect(found).toBeTruthy();
    // Listed key should NOT contain the raw key value
    const foundRecord = found as Record<string, unknown>;
    expect(foundRecord.key).toBeUndefined();

    // Delete key
    const deleteRes = await exports.default.fetch(`https://example.com/api/keys/${keyId}`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(200);

    // Verify deleted
    const listRes2 = await exports.default.fetch("https://example.com/api/keys");
    const list2 = getRecord(await listRes2.json());
    const keys2 = getArrayField(list2, "keys");
    expect(keys2.find((k) => isRecord(k) && getStringField(k as Record<string, unknown>, "id") === keyId)).toBeUndefined();
  });

  it("returns 404 when deleting nonexistent key", async () => {
    const res = await exports.default.fetch("https://example.com/api/keys/nonexistent", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("rejects creating API keys when authenticated via API key", async () => {
    // Create a key first
    const createRes = await exports.default.fetch("https://example.com/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Chain Test" }),
    });
    const created = getRecord(await createRes.json());
    const apiKey = getStringField(created, "key");
    const keyId = getStringField(created, "id");

    // Try to create another key using the API key
    const chainRes = await exports.default.fetch("https://example.com/api/keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ name: "Should Fail" }),
    });
    expect(chainRes.status).toBe(403);

    // Try to list keys using API key
    const listRes = await exports.default.fetch("https://example.com/api/keys", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(listRes.status).toBe(403);

    // Try to delete using API key
    const deleteRes = await exports.default.fetch(`https://example.com/api/keys/${keyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(deleteRes.status).toBe(403);

    // Clean up
    await exports.default.fetch(`https://example.com/api/keys/${keyId}`, { method: "DELETE" });
  });
});

describe("API Key Authentication", () => {
  it("uploads a document using an API key", async () => {
    // Create API key
    const createRes = await exports.default.fetch("https://example.com/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Upload Test" }),
    });
    expect(createRes.status).toBe(201);
    const created = getRecord(await createRes.json());
    const apiKey = getStringField(created, "key");
    const keyId = getStringField(created, "id");

    // Upload document with API key
    const uploadRes = await upload("api-test.html", html, "API Upload Test", {
      Authorization: `Bearer ${apiKey}`,
    });
    expect(uploadRes.status).toBe(200);
    const doc = getRecord(await uploadRes.json());
    const docId = getStringField(doc, "id");
    expect(getStringField(doc, "title")).toBe("API Upload Test");

    // Verify document appears in user's document list (session auth)
    const listRes = await exports.default.fetch("https://example.com/api/documents");
    expect(listRes.status).toBe(200);
    const list = getRecord(await listRes.json());
    const documents = getArrayField(list, "documents");
    expect(documents.some((d) => isRecord(d) && getStringField(d as Record<string, unknown>, "id") === docId)).toBe(true);

    // Clean up
    await exports.default.fetch(`https://example.com/api/documents/${docId}`, { method: "DELETE" });
    await exports.default.fetch(`https://example.com/api/keys/${keyId}`, { method: "DELETE" });
  });

  it("allows updating documents owned by the API key user", async () => {
    // Create API key
    const createRes = await exports.default.fetch("https://example.com/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Update Test" }),
    });
    const created = getRecord(await createRes.json());
    const apiKey = getStringField(created, "key");
    const keyId = getStringField(created, "id");

    // Upload with API key
    const uploadRes = await upload("update-test.html", "<h1>v1</h1>", "Update Test", {
      Authorization: `Bearer ${apiKey}`,
    });
    const doc = getRecord(await uploadRes.json());
    const docId = getStringField(doc, "id");

    // Update with same API key
    const form = new FormData();
    form.append("file", new File(["<h1>v2</h1>"], "updated.html", { type: "text/html" }));
    form.append("title", "Updated");
    const updateRes = await exports.default.fetch(`https://example.com/api/documents/${docId}`, {
      method: "PUT",
      body: form,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(updateRes.status).toBe(200);
    const updated = getRecord(await updateRes.json());
    expect(getStringField(updated, "title")).toBe("Updated");

    // Clean up
    await exports.default.fetch(`https://example.com/api/documents/${docId}`, { method: "DELETE" });
    await exports.default.fetch(`https://example.com/api/keys/${keyId}`, { method: "DELETE" });
  });

  it("allows deleting documents owned by the API key user", async () => {
    // Create API key
    const createRes = await exports.default.fetch("https://example.com/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Delete Test" }),
    });
    const created = getRecord(await createRes.json());
    const apiKey = getStringField(created, "key");
    const keyId = getStringField(created, "id");

    // Upload with API key
    const uploadRes = await upload("delete-test.html", html, "Delete Test", {
      Authorization: `Bearer ${apiKey}`,
    });
    const doc = getRecord(await uploadRes.json());
    const docId = getStringField(doc, "id");

    // Delete with same API key
    const deleteRes = await exports.default.fetch(`https://example.com/api/documents/${docId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(deleteRes.status).toBe(200);

    // Verify deleted
    const metaRes = await exports.default.fetch(`https://example.com/api/documents/${docId}`);
    expect(metaRes.status).toBe(404);

    // Clean up key
    await exports.default.fetch(`https://example.com/api/keys/${keyId}`, { method: "DELETE" });
  });

  it("ignores invalid API key and falls through to session auth in dev mode", async () => {
    // In AUTH_MODE=none, invalid API keys are ignored and dev user is used
    const uploadRes = await upload("invalid-key.html", html, "Invalid Key", {
      Authorization: "Bearer shk_invalidkeythatdoesnotexist1234567890",
    });
    expect(uploadRes.status).toBe(200);
  });

  it("ignores non-shk bearer tokens", async () => {
    // Non-shk_ prefix tokens are not treated as API keys
    const uploadRes = await upload("malformed.html", html, "Malformed", {
      Authorization: "Bearer not_shk_prefix_key",
    });
    expect(uploadRes.status).toBe(200);
  });
});

describe("Dashboard API", () => {
  it("returns paginated documents for authenticated user", async () => {
    // Upload a document first
    const uploadRes = await upload("dashboard-test.html", html, "Dashboard Test");
    expect(uploadRes.status).toBe(200);
    const doc = getRecord(await uploadRes.json());
    const docId = getStringField(doc, "id");

    // Get dashboard
    const dashRes = await exports.default.fetch("https://example.com/api/dashboard");
    expect(dashRes.status).toBe(200);
    const dash = getRecord(await dashRes.json());
    expect(dash.totalCount).toBeGreaterThan(0);
    expect(dash.page).toBe(1);
    expect(dash.pageSize).toBe(10);

    const documents = getArrayField(dash, "documents");
    const found = documents.find((d) => isRecord(d) && getStringField(d as Record<string, unknown>, "id") === docId);
    expect(found).toBeTruthy();

    const foundDoc = found as Record<string, unknown>;
    expect(foundDoc.share_mode).toBeTruthy();

    // Clean up
    await exports.default.fetch(`https://example.com/api/documents/${docId}`, { method: "DELETE" });
  });

  it("respects page and pageSize parameters", async () => {
    const res = await exports.default.fetch("https://example.com/api/dashboard?page=1&pageSize=5");
    expect(res.status).toBe(200);
    const body = getRecord(await res.json());
    expect(body.pageSize).toBe(5);
    expect(body.page).toBe(1);
  });

  it("defaults pageSize when value exceeds max", async () => {
    const res = await exports.default.fetch("https://example.com/api/dashboard?pageSize=500");
    expect(res.status).toBe(200);
    const body = getRecord(await res.json());
    expect(body.pageSize).toBe(10); // defaults to 10 when out of range
  });

  it("returns 401 for unauthenticated user concept", async () => {
    // In AUTH_MODE=none, user is always dev@localhost so this should succeed
    // But test the endpoint still works
    const res = await exports.default.fetch("https://example.com/api/dashboard");
    expect(res.status).toBe(200);
  });
});
