import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// Consolidated status dictionary for all procurement modules
const STATUS_CONFIG: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
  // General
  draft: { variant: "secondary" },
  active: { variant: "default" },
  inactive: { variant: "secondary" },
  
  // Requests
  pending: { variant: "outline" },
  approved: { variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  rejected: { variant: "destructive" },
  converted: { variant: "secondary", className: "bg-primary/10 text-primary border-primary/20" },
  
  // Orders
  sent: { variant: "outline", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  confirmed: { variant: "default", className: "bg-blue-600/15 text-blue-700 dark:text-blue-400 border-blue-600/20" },
  partial: { variant: "outline", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  received: { variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  awaiting_receipt: { variant: "outline", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20" },
  closed: { variant: "secondary" },
  cancelled: { variant: "destructive" },
  
  // Invoices
  paid: { variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  overdue: { variant: "destructive" },
  
  // Urgency
  low: { variant: "secondary" },
  medium: { variant: "outline" },
  high: { variant: "destructive", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20" },
  critical: { variant: "destructive" },
  
  // Projects
  waiting_procurement: { variant: "outline", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  in_progress: { variant: "outline", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" },
  delivered: { variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },

  // RFQs
  receiving_quotes: { variant: "outline", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  evaluated: { variant: "default", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" },
  awarded: { variant: "default", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },

  // RFQ Supplier statuses
  invited: { variant: "outline" },
  responded: { variant: "default", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20" },
};

interface ProcurementStatusBadgeProps {
  status: string;
  className?: string;
}

export function ProcurementStatusBadge({ status, className }: ProcurementStatusBadgeProps) {
  const { t } = useTranslation("procurement");
  const config = STATUS_CONFIG[status] || { variant: "secondary" as const };

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {t(status, status)}
    </Badge>
  );
}