import { Badge } from "@/components/ui/badge";
import { Sparkles, ThumbsUp, CheckCircle, CircleDot, Tag } from "lucide-react";

const CONDITIONS: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  new_with_tags: {
    label: "Novo com etiqueta",
    icon: <Tag className="h-3 w-3" />,
    className: "bg-emerald-500 text-white border-emerald-500",
  },
  new_without_tags: {
    label: "Novo sem etiqueta",
    icon: <Sparkles className="h-3 w-3" />,
    className: "bg-teal-500 text-white border-teal-500",
  },
  very_good: {
    label: "Muito bom",
    icon: <ThumbsUp className="h-3 w-3" />,
    className: "bg-blue-500 text-white border-blue-500",
  },
  good: {
    label: "Bom",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-sky-500 text-white border-sky-500",
  },
  satisfactory: {
    label: "Satisfatório",
    icon: <CircleDot className="h-3 w-3" />,
    className: "bg-amber-500 text-white border-amber-500",
  },
};

interface StoreProductConditionBadgeProps {
  condition: string | null | undefined;
  compact?: boolean;
}

export function StoreProductConditionBadge({ condition, compact = true }: StoreProductConditionBadgeProps) {
  if (!condition || !CONDITIONS[condition]) return null;

  const { label, icon, className } = CONDITIONS[condition];

  return (
    <Badge className={`gap-1 ${compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"} ${className}`}>
      {icon}
      {label}
    </Badge>
  );
}

export const CONDITION_OPTIONS = [
  { value: "new_with_tags", label: "Novo com etiqueta" },
  { value: "new_without_tags", label: "Novo sem etiqueta" },
  { value: "very_good", label: "Muito bom" },
  { value: "good", label: "Bom" },
  { value: "satisfactory", label: "Satisfatório" },
];
