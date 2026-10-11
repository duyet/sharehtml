// WebMCP (https://webmachinelearning.github.io/webmcp/): expose read-only
// tools to in-browser AI agents. No-op when the browser lacks the API.

export interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface ModelContextLike {
  registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => unknown;
}

export interface AgentToolsConfig {
  homeCapabilityToken: string;
  capabilityHeader: string;
  requiresLogin?: boolean;
  fetchFn?: typeof fetch;
}

export function findModelContext(scope: {
  document?: unknown;
  navigator?: unknown;
}): ModelContextLike | null {
  // Chrome moved the API from navigator.modelContext to document.modelContext.
  for (const host of [scope.document, scope.navigator]) {
    const ctx = (host as { modelContext?: unknown } | undefined)?.modelContext;
    if (ctx && typeof (ctx as ModelContextLike).registerTool === "function") {
      return ctx as ModelContextLike;
    }
  }
  return null;
}

function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}

export function buildAgentTools(config: AgentToolsConfig): WebMcpTool[] {
  const fetchFn = config.fetchFn ?? fetch.bind(globalThis);
  const tools: WebMcpTool[] = [
    {
      name: "how_to_publish",
      description:
        "Explain how to publish HTML, Markdown, or code on sharehtml with the CLI or REST API.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      async execute() {
        const response = await fetchFn("/llms.txt", { headers: { Accept: "text/markdown" } });
        return textResult(await response.text());
      },
    },
  ];

  if (config.requiresLogin) return tools;

  tools.push({
    name: "list_my_artifacts",
    description:
      "List the signed-in user's sharehtml documents (id, title, filename, size, created_at). Optional search query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Filter by title or filename" },
        page: { type: "integer", minimum: 1 },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
    annotations: { readOnlyHint: true },
    async execute(input) {
      const params = new URLSearchParams();
      if (typeof input.query === "string" && input.query) params.set("q", input.query);
      params.set("page", String(typeof input.page === "number" ? input.page : 1));
      params.set("limit", String(typeof input.limit === "number" ? input.limit : 20));
      const response = await fetchFn(`/api/documents?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          [config.capabilityHeader]: config.homeCapabilityToken,
        },
      });
      if (!response.ok) return textResult(`Request failed with status ${response.status}`);
      const data: unknown = await response.json();
      const origin = globalThis.location?.origin ?? "";
      const documents =
        data && typeof data === "object" && Array.isArray((data as { documents?: unknown }).documents)
          ? ((data as { documents: Array<{ id: string }> }).documents)
          : [];
      return textResult(
        JSON.stringify(
          {
            ...(data as object),
            documents: documents.map((d) => ({ ...d, url: `${origin}/d/${d.id}` })),
          },
          null,
          2,
        ),
      );
    },
  });

  return tools;
}

export function registerAgentTools(
  modelContext: ModelContextLike | null,
  config: AgentToolsConfig,
): AbortController | null {
  if (!modelContext) return null;
  const controller = new AbortController();
  for (const tool of buildAgentTools(config)) {
    Promise.resolve()
      .then(() => modelContext.registerTool(tool, { signal: controller.signal }))
      .catch((error) => {
      console.warn(`WebMCP: failed to register ${tool.name}`, error);
    });
  }
  return controller;
}
