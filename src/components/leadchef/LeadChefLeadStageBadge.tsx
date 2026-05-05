import { cn } from "@/lib/utils";
import type { LeadChefStage } from "@/types/leadchef";
import { LEADCHEF_STAGE_LABELS, LEADCHEF_STAGE_COLORS } from "./constants";

interface Props {
  stage: LeadChefStage;
  className?: string;
}

export function LeadChefLeadStageBadge({ stage, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        LEADCHEF_STAGE_COLORS[stage],
        className
      )}
    >
      {LEADCHEF_STAGE_LABELS[stage]}
    </span>
  );
}
