import { useTranslation } from "react-i18next";
import { FilterCondition } from "@/hooks/useFilterEngine";
import { X, Plus, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_DOT_COLORS: Record<string, string> = {
  active: "bg-green-500",
  inactive: "bg-muted-foreground",
  open: "bg-blue-500",
  won: "bg-green-500",
  lost: "bg-red-500",
  hot: "bg-red-500",
  warm: "bg-amber-500",
  cold: "bg-blue-500",
  new: "bg-sky-500",
  qualified: "bg-emerald-500",
  contacted: "bg-violet-500",
};

const DOT_FIELDS = ["status", "stage", "temperature", "ai_temperature", "client_status"];

interface ActiveFilterPillsProps {
  conditions: FilterCondition[];
  onRemove: (index: number) => void;
  onAdd?: () => void;
  sortField?: string;
  sortDir?: "asc" | "desc";
  onClearSort?: () => void;
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

export function ActiveFilterPills({ conditions, onRemove, onAdd, sortField, sortDir, onClearSort }: ActiveFilterPillsProps) {
  const { t } = useTranslation("crm");

  if (conditions.length === 0 && !onAdd && !sortField) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Sorted by pill */}
      {sortField && (
        <Badge
          variant="outline"
          className="gap-1 pl-2 pr-1 py-1 text-xs font-normal cursor-default"
        >
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{t("sortedBy", "Sorted by")}</span>
          <span className="font-medium capitalize">{sortField.replace(/_/g, " ")}</span>
          {sortDir && <span className="text-muted-foreground">{sortDir === "desc" ? "↓" : "↑"}</span>}
          {onClearSort && (
            <button
              onClick={onClearSort}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              aria-label={t("filterPillRemove", "Remove sort")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      )}

      {conditions.map((c, i) => {
        const opLabel = OPERATOR_LABELS[c.operator] || c.operator;
        const needsValue = !["is_empty", "is_not_empty", "last_7_days", "last_14_days", "last_30_days", "today"].includes(c.operator);
        const valueStr = needsValue ? String(c.value ?? "") : "";
        const showDot = DOT_FIELDS.includes(c.field) && valueStr;
        const dotColor = showDot ? (STATUS_DOT_COLORS[valueStr.toLowerCase()] || "bg-primary") : "";

        return (
          <Badge
            key={i}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-1 text-xs font-normal cursor-default hover:bg-secondary"
          >
            <span className="font-medium capitalize">{c.field.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground">{opLabel}</span>
            {valueStr && (
              <span className="font-medium flex items-center gap-1">
                {showDot && <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />}
                {valueStr}
              </span>
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
