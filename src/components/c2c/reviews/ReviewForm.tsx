import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RatingStars } from "./RatingStars";
import { useSubmitReview } from "@/hooks/useC2CReviews";

interface ReviewFormProps {
  workspaceId: string;
  sellerId: string;
  listingId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ workspaceId, sellerId, listingId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const submitReview = useSubmitReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    await submitReview.mutateAsync({
      workspace_id: workspaceId,
      seller_id: sellerId,
      listing_id: listingId,
      rating,
      comment: comment || undefined,
    });
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-sm">Classificação</Label>
        <RatingStars rating={rating} size="lg" interactive onChange={setRating} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="review-comment" className="text-sm">Comentário</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Descreve a tua experiência..."
          rows={3}
        />
      </div>
      <Button type="submit" disabled={submitReview.isPending || rating === 0} className="w-full">
        {submitReview.isPending ? "A enviar..." : "Enviar avaliação"}
      </Button>
    </form>
  );
}
