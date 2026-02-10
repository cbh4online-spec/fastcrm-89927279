import { useState } from "react";
import { Star, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useStoreReviews, useStoreReviewStats, useAddStoreReview } from "@/hooks/useStoreReviewsWishlist";
import { StoreRatingBreakdown } from "@/components/store/StoreRatingBreakdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface StoreReviewsSectionProps {
  productId: string;
  workspaceId: string;
}

function StarRating({ rating, onRate, interactive = false, size = "md" }: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          className={cn(
            "transition-colors",
            interactive && "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              sizeClass,
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function StoreReviewsSection({ productId, workspaceId }: StoreReviewsSectionProps) {
  const { data: reviews = [], isLoading } = useStoreReviews(productId);
  const { average, count } = useStoreReviewStats(productId);
  const addReview = useAddStoreReview();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const filteredReviews = filterRating
    ? reviews.filter((r) => r.rating === filterRating)
    : reviews;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Selecione uma classificação");
      return;
    }
    try {
      await addReview.mutateAsync({
        product_id: productId,
        workspace_id: workspaceId,
        rating,
        title: title || undefined,
        comment: comment || undefined,
      });
      toast.success("Avaliação enviada!");
      setShowForm(false);
      setRating(0);
      setTitle("");
      setComment("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar avaliação");
    }
  };

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Avaliações</h2>
          {count > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={Math.round(average)} size="sm" />
              <span className="text-sm text-muted-foreground">
                {average.toFixed(1)} ({count} {count === 1 ? "avaliação" : "avaliações"})
              </span>
            </div>
          )}
        </div>
        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Escrever avaliação
          </Button>
        )}
      </div>

      {/* Rating Breakdown */}
      <StoreRatingBreakdown
        reviews={reviews}
        average={average}
        count={count}
        selectedRating={filterRating}
        onSelectRating={setFilterRating}
      />

      {showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-6 space-y-4 bg-muted/20">
          <div>
            <label className="text-sm font-medium mb-1 block">Classificação *</label>
            <StarRating rating={rating} onRate={setRating} interactive />
          </div>
          <Input
            placeholder="Título (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Escreva a sua avaliação..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="gap-2" disabled={addReview.isPending}>
              <Send className="h-4 w-4" />
              Enviar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {filteredReviews.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground py-4">
          {filterRating
            ? `Sem avaliações de ${filterRating} estrela${filterRating > 1 ? "s" : ""}.`
            : "Ainda não há avaliações. Seja o primeiro a avaliar!"}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((r) => (
            <div key={r.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StarRating rating={r.rating} size="sm" />
                  {r.is_verified_purchase && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-green-600 border-green-200">
                      <CheckCircle className="h-3 w-3" />
                      Compra verificada
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(r.created_at), "d MMM yyyy", { locale: pt })}
                </span>
              </div>
              {r.title && <p className="font-medium text-sm">{r.title}</p>}
              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
