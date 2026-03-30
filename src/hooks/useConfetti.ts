import { useCallback } from "react";
import confetti from "canvas-confetti";

const BRAND_COLORS = ["#f59e0b", "#d97706", "#fbbf24", "#eab308"];

/**
 * Fires a confetti burst with FastCRM amber/gold palette.
 */
export function useConfetti() {
  const fire = useCallback(
    (opts?: confetti.Options) =>
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: BRAND_COLORS,
        ...opts,
      }),
    [],
  );

  return { fire };
}
