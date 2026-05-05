import { cn } from "@/lib/utils";
import type { LeadChefTemperature } from "@/types/leadchef";

const LABEL: Record<LeadChefTemperature, string> = {
  cold: "Frio",
  warm: "Morno",
  hot: "Quente",
};

const STYLES: Record<LeadChefTemperature, string> = {
  cold: "bg-sky-50 text-sky-700 border-sky-200",
  warm: "bg-amber-50 text-amber-700 border-amber-200",
  hot: "bg-rose-50 text-rose-700 border-rose-200",
};

interface Props {
  temperature: LeadChefTemperature;
  className?: string;
}

export function LeadChefLeadTemperatureBadge({ temperature, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
        STYLES[temperature],
        className
      )}
    >
      {LABEL[temperature]}
    </span>
  );
}
