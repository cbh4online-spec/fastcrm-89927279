import { ReviewCard } from "./ReviewCard";
import { RatingStars } from "./RatingStars";
import { useC2CReviews } from "@/hooks/useC2CReviews";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewsListProps {
  sellerId?: string;
  listingId?: string;
}

export function ReviewsList({ sellerId, listingId }: ReviewsListProps) {
  const { reviews, isLoading, avgRating, ratingDistribution } = useC2CReviews({ sellerId, listingId });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Ainda sem avaliações</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-lg">
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
          <RatingStars rating={avgRating} size="md" className="justify-center mt-1" />
          <p className="text-xs text-muted-foreground mt-1">{reviews.length} avaliações</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {ratingDistribution.reverse().map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right">{star}</span>
              <Progress value={reviews.length > 0 ? (count / reviews.length) * 100 : 0} className="h-2 flex-1" />
              <span className="w-6 text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-3">
        {reviews.map((review: any) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
