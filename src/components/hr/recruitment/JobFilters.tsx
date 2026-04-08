import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, LayoutGrid, List } from "lucide-react";

interface JobFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  typeFilter: string;
  onTypeChange: (v: string) => void;
  remoteFilter: string;
  onRemoteChange: (v: string) => void;
  viewMode: "grid" | "table";
  onViewModeChange: (v: "grid" | "table") => void;
}

export function JobFilters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  typeFilter, onTypeChange,
  remoteFilter, onRemoteChange,
  viewMode, onViewModeChange,
}: JobFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar vagas..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Activa</SelectItem>
          <SelectItem value="draft">Rascunho</SelectItem>
          <SelectItem value="closed">Fechada</SelectItem>
          <SelectItem value="cancelled">Cancelada</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="full_time">Tempo inteiro</SelectItem>
          <SelectItem value="part_time">Part-time</SelectItem>
          <SelectItem value="contract">Prestador</SelectItem>
          <SelectItem value="intern">Estágio</SelectItem>
        </SelectContent>
      </Select>
      <Select value={remoteFilter} onValueChange={onRemoteChange}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Modalidade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="office">Presencial</SelectItem>
          <SelectItem value="remote">Remoto</SelectItem>
          <SelectItem value="hybrid">Híbrido</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex border rounded-md">
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="icon"
          className="h-9 w-9 rounded-r-none"
          onClick={() => onViewModeChange("grid")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "table" ? "default" : "ghost"}
          size="icon"
          className="h-9 w-9 rounded-l-none"
          onClick={() => onViewModeChange("table")}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
