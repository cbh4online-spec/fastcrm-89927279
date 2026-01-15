import { SmartFilterType, SmartContactsFilters as FiltersType, EntityTemperature, ContactType } from "@/hooks/useSmartContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Flame, 
  Clock, 
  TrendingUp, 
  Zap, 
  Calendar,
  X,
  SlidersHorizontal,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartContactsFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

const smartFilters: Array<{ key: SmartFilterType; label: string; icon: React.ReactNode }> = [
  { key: "hot", label: "Quentes", icon: <Flame className="w-3 h-3" /> },
  { key: "no_response", label: "Sem Resposta", icon: <Clock className="w-3 h-3" /> },
  { key: "high_intent", label: "Alta Intenção", icon: <TrendingUp className="w-3 h-3" /> },
  { key: "automation_active", label: "Com Automação", icon: <Zap className="w-3 h-3" /> },
  { key: "decision_makers", label: "Decisores", icon: <UserCheck className="w-3 h-3" /> },
  { key: "today", label: "Hoje", icon: <Calendar className="w-3 h-3" /> },
  { key: "this_week", label: "Esta Semana", icon: <Calendar className="w-3 h-3" /> },
];

export function SmartContactsFilters({ filters, onFiltersChange, showAdvanced, onToggleAdvanced }: SmartContactsFiltersProps) {
  const activeFiltersCount = [
    filters.temperature && filters.temperature !== "all",
    filters.contactType && filters.contactType !== "all",
    filters.source && filters.source !== "all",
    filters.smartFilter,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onFiltersChange({
      search: filters.search,
      temperature: "all",
      contactType: "all",
      source: "all",
      smartFilter: undefined,
    });
  };

  return (
    <div className="space-y-3">
      {/* Main filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar contactos..."
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Temperature filter */}
        <Select
          value={filters.temperature || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, temperature: value as EntityTemperature | "all" })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Temperatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="hot">🔥 Quente</SelectItem>
            <SelectItem value="warm">🟡 Morno</SelectItem>
            <SelectItem value="cold">❄️ Frio</SelectItem>
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select
          value={filters.contactType || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, contactType: value as ContactType | "all" })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Tipos</SelectItem>
            <SelectItem value="decision_maker">Decisor</SelectItem>
            <SelectItem value="influencer">Influenciador</SelectItem>
            <SelectItem value="champion">Champion</SelectItem>
            <SelectItem value="end_user">Utilizador</SelectItem>
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select
          value={filters.source || "all"}
          onValueChange={(value) => onFiltersChange({ ...filters, source: value })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Origens</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="referral">Referência</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="event">Evento</SelectItem>
          </SelectContent>
        </Select>

        {/* Toggle advanced columns */}
        <Button
          variant={showAdvanced ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleAdvanced}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Colunas Avançadas
        </Button>

        {/* Clear filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="w-3 h-3" />
            Limpar ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Smart filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Filtros rápidos:</span>
        {smartFilters.map((sf) => (
          <Button
            key={sf.key}
            variant={filters.smartFilter === sf.key ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFiltersChange({ 
              ...filters, 
              smartFilter: filters.smartFilter === sf.key ? undefined : sf.key 
            })}
            className={cn(
              "h-7 text-xs gap-1.5",
              filters.smartFilter === sf.key && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {sf.icon}
            {sf.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
