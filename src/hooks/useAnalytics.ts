import { useCallback } from "react";
import { posthog } from "@/lib/posthog";

/**
 * Thin analytics wrapper around PostHog.
 * All calls are no-ops if PostHog is not initialised.
 */
export function useAnalytics() {
  const track = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      posthog.capture?.(event, properties);
    },
    [],
  );

  const identify = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      posthog.identify?.(userId, traits);
    },
    [],
  );

  const page = useCallback(
    (name?: string, properties?: Record<string, unknown>) => {
      posthog.capture?.("$pageview", { page: name, ...properties });
    },
    [],
  );

  return { track, identify, page };
}
