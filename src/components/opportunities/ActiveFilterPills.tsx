import { useTranslation } from "react-i18next";
import { FilterCondition } from "@/hooks/useFilterEngine";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActiveFilterPillsProps {
  conditions: FilterCondition[];
  onRemove: (index: number) => void;
  onAdd?: () => void;
}

const OPERATOR_LABELS: Record<string, string> = {
  eq: "is",
  neq: "is not",
  contains: "contains",
  not_contains: "does not contain",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  in: "is one of",
  last_7_days: "last 7 days",
  last_14_days: "last 14 days",
  last_30_days: "last 30 days",
  today: "today",
};

export function ActiveFilterPills({ conditions, onRemove, onAdd }: ActiveFilterPillsProps) {
  const { t } = useTranslation("crm");

  if (conditions.length === 0 && !onAdd) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {conditions.map((c, i) => {
        const opLabel = OPERATOR_LABELS[c.operator] || c.operator;
        const needsValue = !["is_empty", "is_not_empty", "last_7_days", "last_14_days", "last_30_days", "today"].includes(c.operator);
        const valueStr = needsValue ? String(c.value ?? "") : "";

        return (
          <Badge
            key={i}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-1 text-xs font-normal cursor-default hover:bg-secondary"
          >
            <span className="font-medium capitalize">{c.field.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground">{opLabel}</span>
            {valueStr && (
              <span className="font-medium">{valueStr}</span>
            )}
            <button
              onClick={() => onRemove(i)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              aria-label={t("filterPillRemove", "Remove filter")}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      {onAdd && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground gap-1"
          onClick={onAdd}
        >
          <Plus className="h-3 w-3" />
          {t("filterPillAdd", "Add filter")}
        </Button>
      )}
    </div>
  );
}
