import { Hono } from "hono";
import type { AppBindings } from "../src/types.js";
import {
  clerkAuthMiddleware,
  handleClerkAuth,
  type ClerkAuthService,
  type ClerkAuthState,
} from "../src/utils/auth.js";

// ---------------------------------------------------------------------------
// Helpers for testing handleClerkAuth (unit-level with injected mock client)
// ---------------------------------------------------------------------------

function makeMockClerkClient(
  authState: ClerkAuthState,
  getUserResult?: { primaryEmailAddress?: { emailAddress: string } | null },
): ClerkAuthService {
  return {
    authenticateRequest: () => Promise.resolve(authState),
    users: {
      getUser: () =>
        Promise.resolve(
          getUserResult ?? { primaryEmailAddress: null },
        ),
    },
  };
}

function makeAuthState(overrides: {
  isAuthenticated: boolean;
  userId?: string | null;
  sessionClaims?: Record<string, unknown>;
}): ClerkAuthState {
  return {
    isAuthenticated: overrides.isAuthenticated,
    toAuth: () => ({
      userId: overrides.userId ?? null,
      sessionClaims: overrides.sessionClaims ?? {},
    }),
  };
}

function createTestContext(headers?: Record<string, string>) {
  const requestHeaders = new Headers(headers);
  let authUser: { id: string; email: string; source: string } | undefined;

  const c = {
    req: {
      raw: new Request("https://example.com/test", { headers: requestHeaders }),
      header: (name: string) => requestHeaders.get(name) ?? undefined,
    },
    set: (key: string, value: unknown) => {
      if (key === "authUser") authUser = value as typeof authUser;
    },
    get: (key: string) => {
      if (key === "authUser") return authUser;
      return undefined;
    },
    text: (body: string, status: number) => new Response(body, { status }),
    json: (body: unknown, status: number) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    env: {} as Record<string, unknown>,
  } as unknown as import("hono").Context<AppBindings>;

  return { c, getAuthUser: () => authUser };
}

// ---------------------------------------------------------------------------
// Tests for handleClerkAuth (pure logic, mock client injected)
// ---------------------------------------------------------------------------

describe("handleClerkAuth", () => {
  it("returns 401 when not authenticated", async () => {
    const client = makeMockClerkClient(makeAuthState({ isAuthenticated: false }));
    const { c } = createTestContext();

    const result = await handleClerkAuth(client, c, async () => {});
    expect(result).toBeDefined();
    expect(result!.status).toBe(401);
    expect(await result!.text()).toBe("Unauthorized");
  });

  it("returns 401 when authenticated but userId is null", async () => {
    const client = makeMockClerkClient(
      makeAuthState({ isAuthenticated: true, userId: null }),
    );
    const { c } = createTestContext();

    const result = await handleClerkAuth(client, c, async () => {});
    expect(result!.status).toBe(401);
  });

  it("extracts email from JWT session claims (primaryEmail)", async () => {
    const client = makeMockClerkClient(
      makeAuthState({
        isAuthenticated: true,
        userId: "user_claims",
        sessionClaims: { primaryEmail: "from-claims@example.com" },
      }),
    );
    const { c, getAuthUser } = createTestContext();

    let nextCalled = false;
    const result = await handleClerkAuth(client, c, async () => {
      nextCalled = true;
    });

    // Should call next (no early response)
    expect(result).toBeUndefined();
    expect(nextCalled).toBe(true);

    const user = getAuthUser();
    expect(user).toEqual({
      id: "user_claims",
      email: "from-claims@example.com",
      source: "cookie",
    });
  });

  it("falls back to getUser API when claims lack primaryEmail", async () => {
    const client = makeMockClerkClient(
      makeAuthState({
        isAuthenticated: true,
        userId: "user_fallback",
        sessionClaims: {}, // no primaryEmail
      }),
      { primaryEmailAddress: { emailAddress: "from-api@example.com" } },
    );
    const { c, getAuthUser } = createTestContext();

    await handleClerkAuth(client, c, async () => {});

    const user = getAuthUser();
    expect(user).toEqual({
      id: "user_fallback",
      email: "from-api@example.com",
      source: "cookie",
    });
  });

  it("returns 401 when email cannot be found via claims or API", async () => {
    const client = makeMockClerkClient(
      makeAuthState({
        isAuthenticated: true,
        userId: "user_no_email",
        sessionClaims: {},
      }),
      { primaryEmailAddress: null },
    );
    const { c } = createTestContext();

    const result = await handleClerkAuth(client, c, async () => {});
    expect(result!.status).toBe(401);
  });

  it("sets source to bearer-token when Authorization header is present", async () => {
    const client = makeMockClerkClient(
      makeAuthState({
        isAuthenticated: true,
        userId: "user_bearer",
        sessionClaims: { primaryEmail: "bearer@example.com" },
      }),
    );
    const { c, getAuthUser } = createTestContext({
      Authorization: "Bearer some-jwt-token",
    });

    await handleClerkAuth(client, c, async () => {});

    const user = getAuthUser();
    expect(user!.source).toBe("bearer-token");
  });

  it("sets source to cookie when no Authorization header", async () => {
    const client = makeMockClerkClient(
      makeAuthState({
        isAuthenticated: true,
        userId: "user_cookie",
        sessionClaims: { primaryEmail: "cookie@example.com" },
      }),
    );
    const { c, getAuthUser } = createTestContext({
      Cookie: "__session=valid-session-token",
    });

    await handleClerkAuth(client, c, async () => {});

    const user = getAuthUser();
    expect(user!.source).toBe("cookie");
  });
});

// ---------------------------------------------------------------------------
// Integration-level: AUTH_MODE=none via Hono app (no Clerk needed)
// ---------------------------------------------------------------------------

describe("clerkAuthMiddleware with AUTH_MODE=none", () => {
  it("returns dev user bypassing Clerk", async () => {
    const app = new Hono<AppBindings>();
    app.use("/*", clerkAuthMiddleware);
    app.get("/test", (c) => {
      const user = c.get("authUser");
      return c.json({ id: user.id, email: user.email, source: user.source });
    });

    const res = await app.fetch(
      new Request("https://example.com/test"),
      { AUTH_MODE: "none" } as unknown as Env,
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({
      id: "dev",
      email: "dev@localhost",
      source: "dev",
    });
  });
});
