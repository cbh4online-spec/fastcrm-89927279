/**
 * Lightweight haptic feedback wrapper.
 * Uses Vibration API where supported. No-op everywhere else.
 *
 * Usage:
 *   const { tap, success, warning, error } = useHaptics();
 *   tap();          // light tap on button press
 *   success();      // positive confirmation
 *   warning();      // mild warning
 *   error();        // destructive / error
 */
import { useCallback } from "react";

type HapticPattern = "tap" | "selection" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  selection: 5,
  success: [10, 30, 10],
  warning: [20, 40, 20],
  error: [40, 30, 40, 30, 40],
};

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  // Respect users that opted out of motion / can break in iframes
  try {
    if ("vibrate" in navigator) {
      // @ts-expect-error vibrate exists at runtime in mobile browsers
      navigator.vibrate(pattern);
    }
  } catch {
    /* no-op */
  }
}

export function useHaptics() {
  const trigger = useCallback((p: HapticPattern) => vibrate(PATTERNS[p]), []);
  return {
    trigger,
    tap: useCallback(() => vibrate(PATTERNS.tap), []),
    selection: useCallback(() => vibrate(PATTERNS.selection), []),
    success: useCallback(() => vibrate(PATTERNS.success), []),
    warning: useCallback(() => vibrate(PATTERNS.warning), []),
    error: useCallback(() => vibrate(PATTERNS.error), []),
  };
}

export const haptics = {
  tap: () => vibrate(PATTERNS.tap),
  selection: () => vibrate(PATTERNS.selection),
  success: () => vibrate(PATTERNS.success),
  warning: () => vibrate(PATTERNS.warning),
  error: () => vibrate(PATTERNS.error),
};
