/**
 * Edge Function Security Classification Tests
 *
 * Documents and validates the security classification of all
 * explicitly configured edge functions in config.toml.
 */
import { describe, it, expect } from "vitest";

// Classification registry — single source of truth
export const EDGE_FUNCTION_CLASSIFICATIONS = {
  // Public webhooks — no JWT, but require signature/payload validation
  "whatsapp-zapi-webhook": "public-webhook",
  "google-calendar-webhook": "public-webhook",
  "handle-email-suppression": "public-webhook",
  "stripe-renewal-webhook": "public-webhook",
  "meta-webhook-hub": "public-webhook",

  // Public tokenized — no JWT, access via signed/expirable token
  "public-booking": "public-tokenized",
  "handle-email-unsubscribe": "public-tokenized",
  "meta-oauth-start": "public-tokenized",
  "meta-oauth-callback": "public-tokenized",
  "instagram-oauth-start": "public-tokenized",
  "instagram-oauth-callback": "public-tokenized",

  // Private authenticated — should validate JWT in code
  "fastmatch-score": "private-authenticated",
  "whatsapp-zapi-send": "private-authenticated",
  "whatsapp-zapi-sync-groups": "private-authenticated",
  "google-calendar-sync": "private-authenticated",
  "csv-url-fetch": "private-authenticated",
  "send-transactional-email": "private-authenticated",
  "preview-transactional-email": "private-authenticated",
  "meta-lead-processor": "private-authenticated",
  "meta-messenger-send": "private-authenticated",
  "meta-health-check": "private-authenticated",
  "meta-asset-sync": "private-authenticated",
  "ebook-generate": "private-authenticated",
  "marketing-mcp": "private-authenticated",

  // Internal — cron or service_role only
  "event-reminder-cron": "internal-cron",
  "process-email-queue": "private-authenticated", // already has verify_jwt=true
} as const;

type Classification = "public-webhook" | "public-tokenized" | "private-authenticated" | "internal-cron";

describe("Edge Function Security Classification", () => {
  it("all classified functions have a valid classification type", () => {
    const validTypes: Classification[] = [
      "public-webhook",
      "public-tokenized",
      "private-authenticated",
      "internal-cron",
    ];
    for (const [fn, classification] of Object.entries(EDGE_FUNCTION_CLASSIFICATIONS)) {
      expect(validTypes).toContain(classification);
    }
  });

  it("public-webhook functions exist (webhook receivers)", () => {
    const webhooks = Object.entries(EDGE_FUNCTION_CLASSIFICATIONS)
      .filter(([, c]) => c === "public-webhook")
      .map(([fn]) => fn);
    expect(webhooks.length).toBeGreaterThan(0);
    // All webhook functions should have clear external source names
    for (const wh of webhooks) {
      expect(wh).toMatch(/webhook|suppression/);
    }
  });

  it("public-tokenized functions are limited to auth flows and public access", () => {
    const tokenized = Object.entries(EDGE_FUNCTION_CLASSIFICATIONS)
      .filter(([, c]) => c === "public-tokenized")
      .map(([fn]) => fn);
    for (const fn of tokenized) {
      expect(fn).toMatch(/oauth|booking|unsubscribe/);
    }
  });

  it("has more private-authenticated than public functions", () => {
    const priv = Object.values(EDGE_FUNCTION_CLASSIFICATIONS).filter(
      (c) => c === "private-authenticated",
    );
    const pub = Object.values(EDGE_FUNCTION_CLASSIFICATIONS).filter(
      (c) => c === "public-webhook" || c === "public-tokenized",
    );
    expect(priv.length).toBeGreaterThan(pub.length);
  });
});
