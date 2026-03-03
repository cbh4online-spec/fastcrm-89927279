import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface NeedsBoardFiltersProps {
  filter: string;
  onFilterChange: (f: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "shortage", label: "Em falta" },
  { key: "urgent", label: "Urgente (≤7d)" },
  { key: "proposals", label: "Propostas" },
  { key: "orders", label: "Encomendas" },
  { key: "projects", label: "Projetos" },
];

export function NeedsBoardFilters({ filter, onFilterChange, searchQuery, onSearchChange }: NeedsBoardFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(f.key)}
            className="text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produto..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
    </div>
  );
}
