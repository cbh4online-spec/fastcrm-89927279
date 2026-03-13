import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RatingStars } from "./RatingStars";
import { useC2CReviews } from "@/hooks/useC2CReviews";
import { toast } from "sonner";

interface ReviewFormProps {
  sellerId: string;
  listingId?: string;
  transactionId?: string;
  buyerEmail: string;
  onSuccess?: () => void;
}

export function ReviewForm({ sellerId, listingId, transactionId, buyerEmail, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const { createReview } = useC2CReviews();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Seleciona uma classificação");
      return;
    }
    await createReview.mutateAsync({
      seller_id: sellerId,
      listing_id: listingId,
      transaction_id: transactionId,
      buyer_email: buyerEmail,
      rating,
      title: title || null,
      comment: comment || null,
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
        <Label htmlFor="review-title" className="text-sm">Título (opcional)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resumo da experiência"
        />
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

      <Button type="submit" disabled={createReview.isPending} className="w-full">
        {createReview.isPending ? "A enviar..." : "Enviar avaliação"}
      </Button>
    </form>
  );
}
