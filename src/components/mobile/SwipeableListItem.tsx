import { ReactNode, useRef, useState, TouchEvent, useCallback } from "react";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";

export interface SwipeAction {
  id: string;
  label: string;
  icon?: ReactNode;
  color?: "default" | "primary" | "warning" | "destructive";
  onAction: () => void;
}

interface SwipeableListItemProps {
  children: ReactNode;
  /** Actions revealed when the user swipes left (right-to-left). */
  rightActions?: SwipeAction[];
  /** Actions revealed when the user swipes right (left-to-right). */
  leftActions?: SwipeAction[];
  className?: string;
  /** Disable on tablet+/desktop. */
  mobileOnly?: boolean;
}

const COLOR_CLASS: Record<NonNullable<SwipeAction["color"]>, string> = {
  default: "bg-secondary text-secondary-foreground",
  primary: "bg-primary text-primary-foreground",
  warning: "bg-amber-500 text-white",
  destructive: "bg-destructive text-destructive-foreground",
};

const ACTION_WIDTH = 72;

/**
 * Native-app-style swipeable list row.
 * Swipe left to reveal `rightActions`, swipe right for `leftActions`.
 * Tap an action button (or release past threshold) to fire it.
 */
export function SwipeableListItem({
  children,
  rightActions = [],
  leftActions = [],
  className,
  mobileOnly = true,
}: SwipeableListItemProps) {
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);

  const maxRight = rightActions.length * ACTION_WIDTH;
  const maxLeft = leftActions.length * ACTION_WIDTH;

  const onTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX - offset;
    setAnimating(false);
  }, [offset]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (startX.current == null) return;
    let dx = e.touches[0].clientX - startX.current;
    // Clamp
    if (dx < -maxRight) dx = -maxRight - (Math.abs(dx) - maxRight) * 0.2;
    if (dx > maxLeft) dx = maxLeft + (dx - maxLeft) * 0.2;
    setOffset(dx);
  }, [maxRight, maxLeft]);

  const onTouchEnd = useCallback(() => {
    setAnimating(true);
    if (offset <= -ACTION_WIDTH * 0.6 && rightActions.length) {
      setOffset(-maxRight);
      haptics.tap();
    } else if (offset >= ACTION_WIDTH * 0.6 && leftActions.length) {
      setOffset(maxLeft);
      haptics.tap();
    } else {
      setOffset(0);
    }
    startX.current = null;
  }, [offset, maxRight, maxLeft, rightActions.length, leftActions.length]);

  const close = useCallback(() => {
    setAnimating(true);
    setOffset(0);
  }, []);

  const fire = useCallback((a: SwipeAction) => {
    haptics.tap();
    a.onAction();
    close();
  }, [close]);

  const handlers = mobileOnly
    ? { onTouchStart, onTouchMove, onTouchEnd }
    : {};

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Right actions (revealed on left swipe) */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {rightActions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => fire(a)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium",
                COLOR_CLASS[a.color ?? "default"]
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {a.icon}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
      {/* Left actions (revealed on right swipe) */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex">
          {leftActions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => fire(a)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium",
                COLOR_CLASS[a.color ?? "default"]
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {a.icon}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <div
        {...handlers}
        onClick={offset !== 0 ? close : undefined}
        style={{
          transform: `translateX(${offset}px)`,
          transition: animating ? "transform 0.2s ease" : "none",
        }}
        className="bg-card relative"
      >
        {children}
      </div>
    </div>
  );
}
