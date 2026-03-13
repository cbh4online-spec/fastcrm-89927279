import { RatingStars } from "./RatingStars";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    comment?: string;
    title?: string;
    buyer_email: string;
    is_verified_purchase?: boolean;
    reply?: string;
    reply_at?: string;
    created_at: string;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const initials = review.buyer_email?.substring(0, 2).toUpperCase() || "??";
  const maskedEmail = review.buyer_email
    ? review.buyer_email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "Anónimo";

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">{maskedEmail}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: pt })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RatingStars rating={review.rating} />
          {review.is_verified_purchase && (
            <Badge variant="secondary" className="text-[10px]">✓ Verificada</Badge>
          )}
        </div>
      </div>

      {review.title && <p className="font-medium text-sm text-foreground">{review.title}</p>}
      {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}

      {review.reply && (
        <div className="ml-4 pl-4 border-l-2 border-primary/20 space-y-1">
          <p className="text-xs font-medium text-primary">Resposta do vendedor</p>
          <p className="text-sm text-muted-foreground">{review.reply}</p>
        </div>
      )}
    </div>
  );
}
