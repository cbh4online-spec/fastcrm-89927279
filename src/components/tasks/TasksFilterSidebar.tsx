import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { TaskStatus } from "@/hooks/useTasks";

export interface TaskFilters {
  status: TaskStatus | "all";
  dateRange: "all" | "overdue" | "today" | "week" | "month";
  relatedType: "all" | "lead" | "contact" | "company" | "opportunity";
}

interface TasksFilterSidebarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

export function TasksFilterSidebar({ filters, onFiltersChange }: TasksFilterSidebarProps) {
  const hasActiveFilters = filters.status !== "all" || filters.dateRange !== "all" || filters.relatedType !== "all";

  const resetFilters = () => {
    onFiltersChange({ status: "all", dateRange: "all", relatedType: "all" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="w-4 h-4" />
          Filtros
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={resetFilters}>
            <X className="w-3 h-3" /> Limpar
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Estado</Label>
          <Select value={filters.status} onValueChange={(v) => onFiltersChange({ ...filters, status: v as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="done">Concluídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={filters.dateRange} onValueChange={(v) => onFiltersChange({ ...filters, dateRange: v as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="overdue">Atrasadas</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Tipo de Entidade</Label>
          <Select value={filters.relatedType} onValueChange={(v) => onFiltersChange({ ...filters, relatedType: v as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
              <SelectItem value="contact">Contactos</SelectItem>
              <SelectItem value="company">Empresas</SelectItem>
              <SelectItem value="opportunity">Oportunidades</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
