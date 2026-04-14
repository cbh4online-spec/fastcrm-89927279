import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LiveBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Reusable pulsating AO VIVO badge with brand red + glow effect.
 */
export function LiveBadge({ size = "md", className }: LiveBadgeProps) {
  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };
  const dotClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <Badge
      className={cn(
        "bg-red-600 text-white border-0 font-bold live-badge-pulse select-none",
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("rounded-full bg-white live-dot-blink inline-block", dotClasses[size])} />
      AO VIVO
    </Badge>
  );
}
