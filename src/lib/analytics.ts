import { posthog } from "@/lib/posthog";

/**
 * Safe event tracking — no-op when PostHog is not initialised or opted out.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    posthog.capture?.(event, properties);
  } catch {
    // Silent — never block UX
  }
}
