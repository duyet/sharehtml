import { type AbuseControlVars, type AuthMode, isAuthEnabled } from "../types.js";
import { normalizeEmail } from "./email.js";

const MB = 1024 * 1024;

export const DEFAULT_MAX_UPLOAD_BYTES = 5 * MB;
export const DEFAULT_USER_QUOTA_DOCS = 500;
export const DEFAULT_USER_QUOTA_BYTES = 200 * MB;
export const DEFAULT_ANONYMOUS_TTL_DAYS = 7;

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type AbuseLimits = {
  maxUploadBytes: number;
  quotaDocs: number;
  quotaBytes: number;
  anonymousTtlDays: number;
};

export function getAbuseLimits(env: AbuseControlVars): AbuseLimits {
  return {
    maxUploadBytes: positiveInt(env.MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES),
    quotaDocs: positiveInt(env.USER_QUOTA_DOCS, DEFAULT_USER_QUOTA_DOCS),
    quotaBytes: positiveInt(env.USER_QUOTA_BYTES, DEFAULT_USER_QUOTA_BYTES),
    anonymousTtlDays: positiveInt(env.ANONYMOUS_TTL_DAYS, DEFAULT_ANONYMOUS_TTL_DAYS),
  };
}

/**
 * Anonymous publishing is off by default when an auth mode is configured;
 * operators opt in with ALLOW_ANONYMOUS_UPLOADS=true.
 */
export function anonymousUploadsAllowed(env: AbuseControlVars & { AUTH_MODE: AuthMode }): boolean {
  if (!isAuthEnabled(env.AUTH_MODE)) return true;
  return env.ALLOW_ANONYMOUS_UPLOADS === "true";
}

export function isAdminEmail(env: AbuseControlVars, email: string): boolean {
  const target = normalizeEmail(email);
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .some((entry) => entry !== "" && entry === target);
}

export function formatBytes(bytes: number): string {
  return bytes >= MB ? `${Math.round((bytes / MB) * 10) / 10} MB` : `${Math.round(bytes / 1024)} KB`;
}
