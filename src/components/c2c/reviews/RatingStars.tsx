import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

const sizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4.5 w-4.5",
  lg: "h-5.5 w-5.5",
};

export function RatingStars({
  rating,
  maxRating = 5,
  size = "sm",
  interactive = false,
  onChange,
  className,
}: RatingStarsProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= Math.round(rating);
        return (
          <Star
            key={i}
            className={cn(
              sizes[size],
              "transition-colors",
              isFilled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
              interactive && "cursor-pointer hover:text-amber-400"
            )}
            onClick={() => interactive && onChange?.(starValue)}
          />
        );
      })}
    </div>
  );
}
