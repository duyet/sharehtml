import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClerkClient } from "@clerk/backend";
import type { Context } from "hono";
import type { AppBindings } from "../types.js";

export interface AuthUser {
  id: string;
  email: string;
  source: AuthSource;
}

export type AuthSource = "access-jwt-header" | "cf-access-token" | "cookie" | "bearer-token" | "dev";

const DEV_USER: AuthUser = Object.freeze({ id: "dev", email: "dev@localhost", source: "dev" });

let jwksCache: { teamName: string; jwks: ReturnType<typeof createRemoteJWKSet> } | null = null;

function getJWKS(teamName: string) {
  if (!jwksCache || jwksCache.teamName !== teamName) {
    jwksCache = {
      teamName,
      jwks: createRemoteJWKSet(
        new URL(`https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`),
      ),
    };
  }
  return jwksCache.jwks;
}

function getAccessJWT(c: Context): { jwt: string | null; source: AuthSource | null } {
  const accessJwtHeader = c.req.header("CF-Access-JWT-Assertion");
  if (accessJwtHeader) {
    return { jwt: accessJwtHeader, source: "access-jwt-header" };
  }

  const accessTokenHeader = c.req.header("cf-access-token");
  if (accessTokenHeader) {
    return { jwt: accessTokenHeader, source: "cf-access-token" };
  }

  const accessCookie = getCookie(c, "CF_Authorization");
  if (accessCookie) {
    return { jwt: accessCookie, source: "cookie" };
  }

  return { jwt: null, source: null };
}

async function verifyAccessJWT(jwt: string, env: Env): Promise<AuthUser | null> {
  if (!env.ACCESS_AUD || !env.ACCESS_TEAM) {
    console.error("ACCESS_AUD or ACCESS_TEAM not configured");
    return null;
  }

  try {
    const jwks = getJWKS(env.ACCESS_TEAM);
    const { payload } = await jwtVerify(jwt, jwks, {
      audience: env.ACCESS_AUD,
      issuer: `https://${env.ACCESS_TEAM}.cloudflareaccess.com`,
    });

    const { sub } = payload;
    const email = "email" in payload && typeof payload.email === "string" ? payload.email : null;
    if (!sub || !email) {
      console.error("JWT missing sub or email claim");
      return null;
    }

    return { id: sub, email };
  } catch (error) {
    console.error(
      "JWT verification failed",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export const authMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  // Fail closed: only skip auth when explicitly set to "none"
  if (c.env.AUTH_MODE === "none") {
    c.set("authUser", DEV_USER);
    await next();
    return;
  }

  const { jwt, source } = getAccessJWT(c);
  if (!jwt || !source) {
    return c.text("Unauthorized", 401);
  }

  const user = await verifyAccessJWT(jwt, c.env);
  if (!user) {
    return c.text("Unauthorized", 401);
  }

  c.set("authUser", { ...user, source });
  await next();
});

export interface ClerkAuthService {
  authenticateRequest(request: Request): Promise<ClerkAuthState>;
  users: {
    getUser(userId: string): Promise<{ primaryEmailAddress?: { emailAddress: string } | null }>;
  };
}

export interface ClerkAuthState {
  isAuthenticated: boolean;
  toAuth(): { userId: string | null; sessionClaims: unknown };
}

export const clerkAuthMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  if (c.env.AUTH_MODE === "none") {
    c.set("authUser", DEV_USER);
    await next();
    return;
  }

  const clerkClient = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
  return handleClerkAuth(clerkClient, c, next);
});

export async function handleClerkAuth(
  clerkClient: ClerkAuthService,
  c: Context<AppBindings>,
  next: () => Promise<void>,
) {
  const requestState = await clerkClient.authenticateRequest(c.req.raw);

  if (!requestState.isAuthenticated) {
    return c.text("Unauthorized", 401);
  }

  const auth = requestState.toAuth();
  const userId = auth.userId;
  if (!userId) {
    return c.text("Unauthorized", 401);
  }

  // Try to get email from session claims first
  const claims = auth.sessionClaims as Record<string, unknown> | undefined;
  let email =
    claims && typeof claims.primaryEmail === "string"
      ? claims.primaryEmail
      : null;

  if (!email) {
    const user = await clerkClient.users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress ?? null;
  }

  if (!email) {
    return c.text("Unauthorized", 401);
  }

  const source: AuthSource = c.req.header("Authorization") ? "bearer-token" : "cookie";
  c.set("authUser", { id: userId, email, source });
  await next();
}

const devMiddleware = createMiddleware<AppBindings>(async (c, next) => {
  c.set("authUser", DEV_USER);
  await next();
});

export function getAuthMiddleware(authMode: AuthMode): typeof authMiddleware {
  if (authMode === "none") {
    return devMiddleware;
  }
  if (authMode === "clerk") {
    return clerkAuthMiddleware;
  }
  return authMiddleware;
}
