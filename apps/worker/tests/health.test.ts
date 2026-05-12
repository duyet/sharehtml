import { exports } from "cloudflare:workers";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const response = await exports.default.fetch("https://example.com/health");
    expect(response.status).toBe(200);
    const body = await response.json<{ status: string }>();
    expect(body).toEqual({ status: "ok" });
  });

  it("does not require authentication", async () => {
    const response = await exports.default.fetch("https://example.com/health", {
      headers: {},
    });
    expect(response.status).toBe(200);
  });
});

describe("GET /docs.md", () => {
  it("returns markdown upload instructions", async () => {
    const response = await exports.default.fetch("https://example.com/docs.md");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");

    const body = await response.text();
    expect(body).toContain("curl -X POST https://html.duyet.net/api/documents");
    expect(body).toContain('-F "file=@report.html"');
    expect(body).toContain("Reference: https://html.duyet.net/docs.md");
  });
});
