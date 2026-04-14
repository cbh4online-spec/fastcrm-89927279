import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

interface LiveBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { badge: "px-1.5 py-0.5 text-[10px] gap-1", dot: "w-1.5 h-1.5", icon: "h-2.5 w-2.5" },
  md: { badge: "px-2.5 py-1 text-xs gap-1.5", dot: "w-2 h-2", icon: "h-3 w-3" },
  lg: { badge: "px-3 py-1.5 text-sm gap-2", dot: "w-2.5 h-2.5", icon: "h-4 w-4" },
};

export function LiveBadge({ size = "md", className }: LiveBadgeProps) {
  const s = sizeConfig[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded-md bg-red-600 text-white animate-pulse",
        s.badge,
        className,
      )}
    >
      <span className={cn("rounded-full bg-white", s.dot)} />
      AO VIVO
    </span>
  );
}
