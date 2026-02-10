import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreRatingBreakdownProps {
  reviews: { rating: number }[];
  average: number;
  count: number;
  selectedRating: number | null;
  onSelectRating: (rating: number | null) => void;
}

export function StoreRatingBreakdown({ reviews, average, count, selectedRating, onSelectRating }: StoreRatingBreakdownProps) {
  if (count === 0) return null;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const starCount = reviews.filter((r) => r.rating === star).length;
    const percentage = count > 0 ? (starCount / count) * 100 : 0;
    return { star, count: starCount, percentage };
  });

  return (
    <div className="flex flex-col sm:flex-row gap-6 mb-8 p-5 rounded-2xl bg-muted/30 border">
      {/* Average summary */}
      <div className="flex flex-col items-center justify-center min-w-[120px] gap-1">
        <span className="text-4xl font-bold text-foreground">{average.toFixed(1)}</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={cn(
                "h-4 w-4",
                s <= Math.round(average)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {count} {count === 1 ? "avaliação" : "avaliações"}
        </span>
        {selectedRating && (
          <button
            onClick={() => onSelectRating(null)}
            className="text-xs text-primary hover:underline mt-1"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* Distribution bars */}
      <div className="flex-1 space-y-2">
        {distribution.map(({ star, count: starCount, percentage }) => (
          <button
            key={star}
            onClick={() => onSelectRating(selectedRating === star ? null : star)}
            className={cn(
              "flex items-center gap-3 w-full group transition-opacity duration-200 rounded-lg px-2 py-1 -mx-2",
              selectedRating && selectedRating !== star && "opacity-40",
              "hover:bg-muted/50"
            )}
          >
            <span className="text-sm font-medium w-14 text-right flex items-center justify-end gap-1">
              {star} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            </span>
            <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  selectedRating === star
                    ? "bg-primary"
                    : "bg-yellow-400"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {starCount}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
