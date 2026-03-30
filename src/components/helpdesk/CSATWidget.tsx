import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface CSATWidgetProps {
  rating?: number | null;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md";
}

export function CSATWidget({ rating, onChange, readOnly = false, size = "sm" }: CSATWidgetProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayRating = hovered ?? rating ?? 0;

  const starSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className={cn(
            "transition-colors",
            readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              starSize,
              star <= displayRating
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
      {rating && (
        <span className="text-[10px] text-muted-foreground ml-1">{rating}/5</span>
      )}
    </div>
  );
}
