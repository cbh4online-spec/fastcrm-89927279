import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketCSATStarsProps {
  rating: number | null;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export function TicketCSATStars({ rating, onChange, readonly }: TicketCSATStarsProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn(
            "transition-colors",
            !readonly && "hover:text-amber-400 cursor-pointer",
            readonly && "cursor-default"
          )}
        >
          <Star
            className={cn(
              "h-5 w-5",
              rating && star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
      {rating && <span className="text-sm text-muted-foreground ml-2">{rating}/5</span>}
    </div>
  );
}
