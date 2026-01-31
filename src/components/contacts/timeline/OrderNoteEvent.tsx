import { Link } from "react-router-dom";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { orderNoteStatusConfig, type OrderNoteStatus } from "@/types/order-note";
import { FileText, ExternalLink, CreditCard } from "lucide-react";

interface OrderNoteEventProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    total_gross: number;
    submitted_at?: string | null;
    created_at: string;
    installment_requested?: boolean;
    installment_count?: number;
  };
  showLink?: boolean;
}

export function OrderNoteEvent({ order, showLink = true }: OrderNoteEventProps) {
  const statusConfig = orderNoteStatusConfig[order.status as OrderNoteStatus];
  const eventDate = order.submitted_at || order.created_at;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="p-2 rounded-lg bg-primary/10 text-primary">
        <FileText className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium font-mono text-sm">
            {order.order_number}
          </span>
          <Badge 
            className={`${statusConfig?.bgColor} ${statusConfig?.color} border-0 text-xs`}
          >
            {statusConfig?.labelPT}
          </Badge>
          {order.installment_requested && (
            <Badge variant="outline" className="text-xs gap-1">
              <CreditCard className="h-3 w-3" />
              {order.installment_count}x
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(eventDate), "d MMM yyyy, HH:mm", { locale: pt })}
        </p>

        <p className="text-sm font-semibold text-primary mt-1">
          {order.total_gross.toFixed(2)}€
        </p>
      </div>

      {showLink && (
        <Link 
          to={`/dashboard/order-notes/${order.id}`}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
