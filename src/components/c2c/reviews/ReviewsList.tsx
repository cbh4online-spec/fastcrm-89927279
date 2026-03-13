import { ReviewCard } from "./ReviewCard";
import { RatingStars } from "./RatingStars";
import { useSellerReviews, useListingReviews } from "@/hooks/useC2CReviews";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface ReviewsListProps {
  sellerId?: string;
  listingId?: string;
}

export function ReviewsList({ sellerId, listingId }: ReviewsListProps) {
  const sellerQuery = useSellerReviews(sellerId);
  const listingQuery = useListingReviews(listingId);

  const { data: reviews = [], isLoading } = listingId ? listingQuery : sellerQuery;

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const ratingDistribution = useMemo(() => {
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r: any) => r.rating === star).length,
    }));
  }, [reviews]);

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
      <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-lg">
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
          <RatingStars rating={avgRating} size="md" className="justify-center mt-1" />
          <p className="text-xs text-muted-foreground mt-1">{reviews.length} avaliações</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {ratingDistribution.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right">{star}</span>
              <Progress value={reviews.length > 0 ? (count / reviews.length) * 100 : 0} className="h-2 flex-1" />
              <span className="w-6 text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review: any) => (
          <ReviewCard key={review.id} review={{
            ...review,
            buyer_email: review.reviewer_id || "anónimo",
          }} />
        ))}
      </div>
    </div>
  );
}
