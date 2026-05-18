import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { STATUS_LABELS } from "../lib/collectionsFormat";
import type { CollectionCaseListFilters, CollectionStatus } from "../types/collections";

const STATUSES: CollectionStatus[] = [
  "new", "in_progress", "promise", "plan", "partially_paid", "escalated", "paid", "closed",
];

interface Props {
  value: CollectionCaseListFilters;
  onChange: (next: CollectionCaseListFilters) => void;
}

export function CollectionsFilters({ value, onChange }: Props) {
  const toggleStatus = (s: CollectionStatus) => {
    const cur = value.status ?? [];
    onChange({
      ...value,
      status: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    });
  };

  const hasFilters =
    (value.status?.length ?? 0) > 0 ||
    !!value.search ||
    !!value.minOverdueDays ||
    !!value.minAmount;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar devedor…"
            value={value.search ?? ""}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={value.orderBy ?? "total_due"}
          onValueChange={(v) => onChange({ ...value, orderBy: v as CollectionCaseListFilters["orderBy"] })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total_due">Maior dívida</SelectItem>
            <SelectItem value="oldest_due_date">Mais antigo em atraso</SelectItem>
            <SelectItem value="updated_at">Atualizado recentemente</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ orderBy: value.orderBy })
            }
          >
            <X className="h-4 w-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = value.status?.includes(s);
          return (
            <Badge
              key={s}
              variant={active ? "default" : "outline"}
              className="cursor-pointer select-none"
              onClick={() => toggleStatus(s)}
            >
              {STATUS_LABELS[s]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
