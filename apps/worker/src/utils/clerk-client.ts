import { createClerkClient } from "@clerk/backend";
import type { ClerkClient } from "@clerk/backend";

let cachedClient: { secretKey: string; client: ClerkClient } | null = null;

export function getClerkClient(secretKey: string): ClerkClient {
  if (cachedClient && cachedClient.secretKey === secretKey) {
    return cachedClient.client;
  }

  const client = createClerkClient({ secretKey });
  cachedClient = { secretKey, client };
  return client;
}

export interface AuthPayload {
  userId: string;
  payload: Record<string, unknown>;
}

export async function getClerkEmailFromToken(
  auth: AuthPayload,
  client: ClerkClient,
): Promise<string | null> {
  if (typeof auth.payload.email === "string") {
    return auth.payload.email;
  }

  const user = await client.users.getUser(auth.userId);
  return user.primaryEmailAddress?.emailAddress ?? null;
}
