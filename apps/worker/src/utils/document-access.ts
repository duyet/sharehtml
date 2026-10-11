import { HTTPException } from "hono/http-exception";
import { shareModeFromInt, type AppBindings, type DocumentRow } from "../types.js";
import { emailsMatch, normalizeEmail } from "./email.js";
import { getRegistry } from "./registry.js";

export function canViewDocument(
  doc: Pick<DocumentRow, "owner_email" | "is_shared">,
  email: string,
  sharedEmails?: string[],
): boolean {
  const normalizedEmail = normalizeEmail(email);
  if (emailsMatch(doc.owner_email, normalizedEmail)) return true;

  switch (shareModeFromInt(doc.is_shared)) {
    case "link":
      return true;
    case "emails":
      return sharedEmails?.includes(normalizedEmail) ?? false;
    case "private":
    default:
      return false;
  }
}

export function isExpired(doc: Pick<DocumentRow, "expires_at">, now = Date.now()): boolean {
  if (!doc.expires_at) return false;
  return Date.parse(`${doc.expires_at.replace(" ", "T")}Z`) <= now;
}

export const DISABLED_DOCUMENT_MESSAGE = "This document has been disabled after an abuse report.";

/**
 * Loads a document the caller may view. Returns null (404) for missing,
 * expired or unauthorized documents; throws 451 for admin takedowns so the
 * reason is visible even to the owner.
 */
export async function loadDocWithAccessCheck(
  env: AppBindings["Bindings"],
  id: string,
  email: string,
): Promise<{ doc: DocumentRow; registry: ReturnType<typeof getRegistry> } | null> {
  const registry = getRegistry(env);
  const doc = await registry.getDocument(id);
  if (!doc || isExpired(doc)) return null;

  const sharedEmails = shareModeFromInt(doc.is_shared) === "emails"
    ? await registry.getSharedEmails(id)
    : undefined;
  if (!canViewDocument(doc, email, sharedEmails)) return null;
  if (doc.disabled_at) throw new HTTPException(451, { message: DISABLED_DOCUMENT_MESSAGE });

  return { doc, registry };
}
