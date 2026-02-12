import { useState } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitReview } from "@/hooks/useFastMatchReviews";
import { cn } from "@/lib/utils";

interface ReputationReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  reviewedProfileId: string;
  companyName: string;
}

export function ReputationReviewDialog({
  open,
  onOpenChange,
  connectionId,
  reviewedProfileId,
  companyName,
}: ReputationReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const submitReview = useSubmitReview();

  const handleSubmit = async () => {
    if (rating === 0) return;
    await submitReview.mutateAsync({
      connectionId,
      reviewedProfileId,
      rating,
      comment: comment.trim() || undefined,
    });
    setRating(0);
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Conexão</DialogTitle>
          <DialogDescription>
            Como avalia a sua experiência com <strong>{companyName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Star Rating */}
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "w-8 h-8 transition-colors",
                    (hoveredRating || rating) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  )}
                />
              </button>
            ))}
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Comentário opcional..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitReview.isPending}
          >
            {submitReview.isPending ? "A enviar..." : "Enviar Avaliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
