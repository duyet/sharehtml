import { Hono } from "hono";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { getRegistry } from "../utils/registry.js";
import { normalizeEmail } from "../utils/email.js";

const webhooks = new Hono();

webhooks.post("/clerk", async (c) => {
  // Skip signature verification in dev mode
  const isDev = c.env.AUTH_MODE === "none";
  const webhookSecret = c.env.CLERK_WEBHOOK_SECRET;

  if (!isDev && !webhookSecret) {
    return c.json({ error: "Webhook secret not configured" }, 500);
  }

  let event;
  if (isDev) {
    // In dev mode, parse the payload without verification
    const payload = await c.req.json();
    event = payload;
  } else {
    // Verify webhook signature using Clerk's verifyWebhook
    try {
      event = await verifyWebhook(c.req.raw, { signingSecret: webhookSecret });
    } catch {
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  // Handle user events
  if (event.type === "user.created" || event.type === "user.updated") {
    const { data } = event;

    // Find primary email
    const emailObj = data.email_addresses?.find(
      (e: { id: string }) => e.id === data.primary_email_address_id
    ) || data.email_addresses?.[0];

    if (!emailObj?.email_address) {
      return c.json({ ok: false, error: "No email found" }, 400);
    }

    const email = normalizeEmail(emailObj.email_address);

    // Build display name
    const displayName =
      [data.first_name, data.last_name, data.username]
        .filter(Boolean)
        .join(" ") || email.split("@")[0];

    // Create or update user in Registry DO
    const registry = getRegistry(c.env);
    await registry.setUser(email, displayName);
  }

  if (event.type === "user.deleted") {
    const { data } = event;

    // Find primary email from deleted user data
    const emailObj = data.email_addresses?.[0];
    if (!emailObj?.email_address) {
      return c.json({ ok: true }); // No email, nothing to delete
    }

    const email = normalizeEmail(emailObj.email_address);
    const registry = getRegistry(c.env);
    await registry.deleteUser(email);
  }

  return c.json({ ok: true });
});

export default webhooks;
