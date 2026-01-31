import { Badge } from "@/components/ui/badge";
import { orderNoteStatusConfig, type OrderNoteStatus } from "@/types/order-note";
import { Clock, CheckCircle, XCircle, Package, FileText, Ban, Send, AlertTriangle } from "lucide-react";

interface OrderNoteStatusBadgeProps {
  status: OrderNoteStatus;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusIcons: Record<OrderNoteStatus, React.ReactNode> = {
  draft: <FileText className="h-3 w-3" />,
  submitted: <Send className="h-3 w-3" />,
  awaiting_approval: <AlertTriangle className="h-3 w-3" />,
  approved: <CheckCircle className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
  in_preparation: <Package className="h-3 w-3" />,
  invoiced: <FileText className="h-3 w-3" />,
  cancelled: <Ban className="h-3 w-3" />,
};

export function OrderNoteStatusBadge({
  status,
  showIcon = true,
  size = "md",
}: OrderNoteStatusBadgeProps) {
  const config = orderNoteStatusConfig[status];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      className={`${config.bgColor} ${config.color} ${sizeClasses[size]} font-medium border-0 gap-1.5`}
      variant="outline"
    >
      {showIcon && statusIcons[status]}
      {config.labelPT}
    </Badge>
  );
}
