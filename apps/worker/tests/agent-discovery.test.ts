import { exports } from "cloudflare:workers";
import {
  buildAgentTools,
  findModelContext,
  registerAgentTools,
  type WebMcpTool,
} from "../src/client/webmcp.js";

describe("GET /llms.txt", () => {
  it("serves an agent guide with the publish and list endpoints", async () => {
    const response = await exports.default.fetch("https://example.com/llms.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
    expect(response.headers.get("Cache-Control")).toContain("max-age");
    const body = await response.text();
    expect(body.startsWith("# sharehtml")).toBe(true);
    for (const needle of [
      "POST /api/documents",
      "POST /api/v1/publish",
      "GET /api/documents",
      "Authorization: Bearer shk_",
      "npx -y @duyet/sharehtml@latest deploy",
      "https://example.com/d/",
    ]) {
      expect(body).toContain(needle);
    }
    // Private analytics must never leak into the public guide.
    expect(body).not.toContain("/api/stats");
  });
});

describe("homepage agent hints", () => {
  it("links the agent guide from <head>", async () => {
    const response = await exports.default.fetch("https://example.com/");
    const html = await response.text();
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain('<link rel="alternate" type="text/markdown" href="/llms.txt"');
  });
});

describe("WebMCP registration", () => {
  const baseConfig = { homeCapabilityToken: "tok", capabilityHeader: "X-Cap" };

  it("is a no-op when the browser has no modelContext", () => {
    expect(findModelContext({ document: {}, navigator: {} })).toBeNull();
    expect(registerAgentTools(null, baseConfig)).toBeNull();
  });

  it("prefers document.modelContext and registers read-only tools", async () => {
    const registered: WebMcpTool[] = [];
    const ctx = { registerTool: (tool: WebMcpTool) => void registered.push(tool) };
    const legacy = { registerTool: () => undefined };
    const found = findModelContext({ document: { modelContext: ctx }, navigator: { modelContext: legacy } });
    expect(found).toBe(ctx);
    registerAgentTools(found, baseConfig);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(registered.map((t) => t.name).sort()).toEqual(["how_to_publish", "list_my_artifacts"]);
    expect(registered.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });

  it("does not offer the document list to signed-out visitors", () => {
    const names = buildAgentTools({ ...baseConfig, requiresLogin: true }).map((t) => t.name);
    expect(names).toEqual(["how_to_publish"]);
  });

  it("lists documents with the home capability header", async () => {
    let seen: { url: string; header: string | null } | null = null;
    const fetchFn = (async (url: string, init?: RequestInit) => {
      seen = { url, header: new Headers(init?.headers).get("X-Cap") };
      return Response.json({ documents: [{ id: "abc" }] });
    }) as typeof fetch;
    const tool = buildAgentTools({ ...baseConfig, fetchFn }).find((t) => t.name === "list_my_artifacts");
    await tool?.execute({ query: "q" });
    expect(seen).toEqual({ url: "/api/documents?q=q&page=1&limit=20", header: "tok" });
  });
});
