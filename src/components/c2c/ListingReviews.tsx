import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useListingReviews, useSubmitReview } from "@/hooks/useC2CReviews";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, type Locale as DateLocale } from "date-fns";
import { pt, enUS, es, fr } from "date-fns/locale";

const dateLocales: Record<string, DateLocale> = { pt, en: enUS, es, fr };

function StarRating({ value, onChange, readonly = false, size = "md" }: { value: number; onChange?: (v: number) => void; readonly?: boolean; size?: "sm" | "md" }) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass, "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer",
            star <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          )}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        />
      ))}
    </div>
  );
}

interface ListingReviewsProps {
  listingId: string;
  sellerId: string;
  workspaceId: string;
}

export function ListingReviews({ listingId, sellerId, workspaceId }: ListingReviewsProps) {
  const { t, i18n } = useTranslation('marketplace');
  const locale = dateLocales[i18n.language] || pt;
  const { user } = useAuth();
  const { data: reviews = [] } = useListingReviews(listingId);
  const submitReview = useSubmitReview();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const alreadyReviewed = reviews.some((r) => r.reviewer_id === user?.id);
  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    submitReview.mutate(
      { workspace_id: workspaceId, listing_id: listingId, seller_id: sellerId, rating, comment },
      { onSuccess: () => { setShowForm(false); setRating(0); setComment(""); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{t('reviewsTitle')}</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5">
              <StarRating value={Math.round(avgRating)} readonly size="sm" />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} ({reviews.length})
              </span>
            </div>
          )}
        </div>
        {user && user.id !== sellerId && !alreadyReviewed && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            {t('writeReview')}
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">{t('yourRating')}</p>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <Textarea
                placeholder={t('reviewCommentPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" size="sm" disabled={rating === 0 || submitReview.isPending}>
                  {submitReview.isPending ? t('submitting') : t('submitReview')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {reviews.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">{t('noReviewsYet')}</p>
      )}

      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating value={review.rating} readonly size="sm" />
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(review.created_at), "d MMM yyyy", { locale })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Compact seller reputation badge
export function SellerReputationBadge({ avgRating, totalReviews }: { avgRating: number; totalReviews: number }) {
  const { t } = useTranslation('marketplace');
  if (totalReviews === 0) return null;

  const level = avgRating >= 4.5 ? t('ratingExcellent') : avgRating >= 4 ? t('ratingVeryGood') : avgRating >= 3 ? t('ratingGood') : t('ratingFair');
  const color = avgRating >= 4.5 ? "text-emerald-600" : avgRating >= 4 ? "text-green-600" : avgRating >= 3 ? "text-yellow-600" : "text-orange-600";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
      </div>
      <span className={cn("text-xs font-medium", color)}>{level}</span>
      <span className="text-xs text-muted-foreground">({totalReviews})</span>
    </div>
  );
}
