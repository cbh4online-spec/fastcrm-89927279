import { cn } from "@/lib/utils";
import { LEADCHEF_REFERRAL_STATUS_COLORS, LEADCHEF_REFERRAL_STATUS_LABELS } from "./constants";
import type { LeadChefReferralStatus } from "@/types/leadchef";

export function LeadChefReferralStatusBadge({ status, className }: { status: LeadChefReferralStatus; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
      LEADCHEF_REFERRAL_STATUS_COLORS[status],
      className
    )}>
      {LEADCHEF_REFERRAL_STATUS_LABELS[status]}
    </span>
  );
}
