import { useState } from "react";
import { useListingReviews, useSubmitReview } from "@/hooks/useC2CReviews";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 transition-colors ${readonly ? "cursor-default" : "cursor-pointer"} ${
            star <= (hover || value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
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
          <h3 className="text-lg font-semibold">Avaliações</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5">
              <StarRating value={Math.round(avgRating)} readonly />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} ({reviews.length})
              </span>
            </div>
          )}
        </div>
        {user && !alreadyReviewed && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            Avaliar
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">A tua avaliação</p>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <Textarea
                placeholder="Comentário (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={rating === 0 || submitReview.isPending}>
                  {submitReview.isPending ? "A enviar..." : "Submeter"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {reviews.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Ainda sem avaliações.</p>
      )}

      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StarRating value={review.rating} readonly />
                </div>
                {review.comment && <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(review.created_at).toLocaleDateString("pt-PT")}
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
  if (totalReviews === 0) return null;

  const level = avgRating >= 4.5 ? "Excelente" : avgRating >= 4 ? "Muito Bom" : avgRating >= 3 ? "Bom" : "Regular";
  const color = avgRating >= 4.5 ? "text-emerald-600" : avgRating >= 4 ? "text-green-600" : avgRating >= 3 ? "text-yellow-600" : "text-orange-600";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
      </div>
      <span className={`text-xs font-medium ${color}`}>{level}</span>
      <span className="text-xs text-muted-foreground">({totalReviews})</span>
    </div>
  );
}
