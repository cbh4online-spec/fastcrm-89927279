import { cn } from "@/lib/utils";
import {
  LEADCHEF_CLIENT_STATUS_COLORS,
  LEADCHEF_CLIENT_STATUS_LABELS,
  type LeadChefClientStatus,
} from "./constants";

export function LeadChefClientStatusBadge({ status, className }: { status: LeadChefClientStatus; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
      LEADCHEF_CLIENT_STATUS_COLORS[status],
      className
    )}>
      {LEADCHEF_CLIENT_STATUS_LABELS[status]}
    </span>
  );
}
