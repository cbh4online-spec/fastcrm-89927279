import { Button } from "@/components/ui/button";
import { Merge, X } from "lucide-react";

interface EntitySelectionBarProps {
  count: number;
  onMerge: () => void;
  onClear: () => void;
  entityLabel: string;
}

export function EntitySelectionBar({ count, onMerge, onClear, entityLabel }: EntitySelectionBarProps) {
  if (count === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2">
      <span className="text-sm font-medium text-foreground">
        {count} {entityLabel}{count === 1 ? "" : "s"} selecionado{count === 1 ? "" : "s"}
      </span>
      <Button
        size="sm"
        onClick={onMerge}
        disabled={count < 2}
        title={count < 2 ? "Selecione pelo menos 2 registos para fundir" : undefined}
      >
        <Merge className="mr-2 h-4 w-4" />
        Fundir
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        <X className="mr-2 h-4 w-4" />
        Limpar seleção
      </Button>
    </div>
  );
}
