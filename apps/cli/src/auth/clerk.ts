import * as readline from "node:readline";
import { getAuthToken, getApiKey, setAuthToken, setApiKey } from "../config/store.js";

export async function getAuthHeaders(
  workerUrl: string,
): Promise<{ headers: Record<string, string>; canLogin: boolean }> {
  const apiKey = getApiKey();
  if (apiKey) {
    return {
      headers: { Authorization: `Bearer ${apiKey}` },
      canLogin: true,
    };
  }

  const token = getAuthToken();
  if (!token) {
    return { headers: {}, canLogin: true };
  }

  return {
    headers: { Authorization: `Bearer ${token}` },
    canLogin: true,
  };
}

export async function loginWithClerk(workerUrl: string): Promise<void> {
  console.log(`\nClerk authentication for ${workerUrl}`);
  console.log(`Open your browser and visit: ${workerUrl}/cli-token`);
  console.log("Copy the session token and paste it below.\n");

  const token = await promptForToken();
  if (!token) {
    throw new Error("No token provided");
  }

  const resp = await fetch(`${workerUrl}/api/auth/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    throw new Error(
      `Token verification failed (${resp.status}). The token may be expired or invalid. Try again with a fresh token.`,
    );
  }

  const data = await resp.json() as { ok: boolean; email: string };
  setAuthToken(token);
  console.log(`Authenticated as ${data.email}`);
}

export async function detectClerkDeployment(workerUrl: string): Promise<boolean> {
  try {
    const resp = await fetch(`${workerUrl}/api/auth/verify`, {
      headers: { Authorization: "Bearer probe" },
    });
    // If the endpoint exists (even returning 401), it's a Clerk deployment
    return true;
  } catch {
    return false;
  }
}

export async function loginWithApiKey(workerUrl: string): Promise<void> {
  console.log(`\nAPI key authentication for ${workerUrl}`);
  console.log("Paste your API key below.\n");

  const key = await promptForToken();
  if (!key) {
    throw new Error("No API key provided");
  }

  const resp = await fetch(`${workerUrl}/api/auth/verify`, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!resp.ok) {
    throw new Error(
      `API key verification failed (${resp.status}). The key may be invalid or revoked.`,
    );
  }

  const data = await resp.json() as { ok: boolean; email: string };
  if (!data.ok) {
    throw new Error("API key verification failed. The key may be invalid or revoked.");
  }
  setApiKey(key);
  console.log(`Authenticated as ${data.email} (API key)`);
}

function promptForToken(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Token: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
