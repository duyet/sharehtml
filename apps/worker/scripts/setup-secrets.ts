#!/usr/bin/env bun
/**
 * Setup Clerk secrets for Cloudflare Workers production deployment
 *
 * Usage: pnpm run setup:secrets
 */

const { execSync } = require("child_process");

// Keys from GitHub secrets
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const CLERK_JWT_KEY = process.env.CLERK_JWT_KEY || "";

if (!CLERK_SECRET_KEY) {
  console.error("❌ CLERK_SECRET_KEY environment variable not set");
  console.log("\nSet it first:");
  console.log("  export CLERK_SECRET_KEY=sk_live_...");
  process.exit(1);
}

if (!CLERK_JWT_KEY) {
  console.error("❌ CLERK_JWT_KEY environment variable not set");
  console.log("\nSet it first:");
  console.log('  export CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----\\n..."');
  process.exit(1);
}

console.log("Setting Clerk secrets in Cloudflare Workers...\n");

try {
  // Set CLERK_SECRET_KEY
  console.log("🔑 Setting CLERK_SECRET_KEY...");
  execSync(
    `echo "${CLERK_SECRET_KEY}" | wrangler secret put CLERK_SECRET_KEY --env production`,
    { stdio: "inherit" },
  );
  console.log("✅ CLERK_SECRET_KEY set\n");

  // Set CLERK_JWT_KEY
  console.log("🔑 Setting CLERK_JWT_KEY...");
  execSync(
    `echo "${CLERK_JWT_KEY}" | wrangler secret put CLERK_JWT_KEY --env production`,
    { stdio: "inherit" },
  );
  console.log("✅ CLERK_JWT_KEY set\n");

  console.log("✨ All secrets configured successfully!");
  console.log("\nYou can now deploy with:");
  console.log("  pnpm run deploy");
} catch (error) {
  console.error("❌ Failed to set secrets:", error.message);
  process.exit(1);
}
