import { cn } from "@/lib/utils";

export type DocumentStatusTone =
  | "draft"
  | "final"
  | "paid"
  | "sent"
  | "partial"
  | "overdue"
  | "cancelled"
  | "approved"
  | "rejected"
  | "pending"
  | "neutral";

const toneStyles: Record<DocumentStatusTone, string> = {
  draft: "bg-amber-100 text-amber-800",
  final: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  sent: "bg-blue-100 text-blue-800",
  partial: "bg-orange-100 text-orange-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-700",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-800",
  neutral: "bg-muted text-muted-foreground",
};

interface DocumentStatusBadgeProps {
  label: string;
  tone?: DocumentStatusTone;
  className?: string;
}

export function DocumentStatusBadge({
  label,
  tone = "neutral",
  className,
}: DocumentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
