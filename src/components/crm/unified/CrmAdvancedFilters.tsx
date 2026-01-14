import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Filter, X, CalendarIcon, Tag } from "lucide-react";
import { CrmEntityType, CONTACT_STATUSES } from "@/hooks/useCrmViews";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface CrmFilters {
  status?: string;
  stage?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  valueMin?: number;
  valueMax?: number;
}

interface CrmAdvancedFiltersProps {
  entityType: CrmEntityType;
  filters: CrmFilters;
  stages?: { id: string; name: string }[];
  availableTags?: string[];
  onFiltersChange: (filters: CrmFilters) => void;
}

export function CrmAdvancedFilters({
  entityType,
  filters,
  stages = [],
  availableTags = [],
  onFiltersChange,
}: CrmAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<CrmFilters>(filters);
  const [tagInput, setTagInput] = useState("");

  const activeFiltersCount = Object.entries(filters).filter(([_, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  }).length;

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleReset = () => {
    const emptyFilters: CrmFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const handleRemoveFilter = (key: keyof CrmFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
    setLocalFilters(newFilters);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !localFilters.tags?.includes(tagInput.trim())) {
      setLocalFilters({
        ...localFilters,
        tags: [...(localFilters.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setLocalFilters({
      ...localFilters,
      tags: localFilters.tags?.filter((t) => t !== tag) || [],
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Active filters badges */}
      {filters.status && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Estado: {CONTACT_STATUSES.find(s => s.id === filters.status)?.name || filters.status}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={() => handleRemoveFilter("status")}
          />
        </Badge>
      )}
      {filters.stage && stages.length > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Etapa: {stages.find(s => s.id === filters.stage)?.name || filters.stage}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={() => handleRemoveFilter("stage")}
          />
        </Badge>
      )}
      {filters.dateFrom && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Desde: {format(filters.dateFrom, "dd/MM/yy", { locale: pt })}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={() => handleRemoveFilter("dateFrom")}
          />
        </Badge>
      )}
      {filters.dateTo && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Até: {format(filters.dateTo, "dd/MM/yy", { locale: pt })}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={() => handleRemoveFilter("dateTo")}
          />
        </Badge>
      )}
      {(filters.valueMin !== undefined || filters.valueMax !== undefined) && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Valor: {filters.valueMin ?? 0}€ - {filters.valueMax ?? "∞"}€
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={() => {
              handleRemoveFilter("valueMin");
              handleRemoveFilter("valueMax");
            }}
          />
        </Badge>
      )}
      {filters.tags && filters.tags.length > 0 && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Tag className="h-3 w-3" />
          {filters.tags.length} etiqueta{filters.tags.length !== 1 ? "s" : ""}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={() => handleRemoveFilter("tags")}
          />
        </Badge>
      )}

      {/* Filter button */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filtros avançados</SheetTitle>
            <SheetDescription>
              Refine a sua pesquisa com filtros específicos para encontrar exatamente o que procura.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Status/Stage filter */}
            {entityType === "contacts" ? (
              <div className="space-y-2">
                <Label>Estado do contacto</Label>
                <Select
                  value={localFilters.status || ""}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, status: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os estados</SelectItem>
                    {CONTACT_STATUSES.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Etapa do negócio</Label>
                <Select
                  value={localFilters.stage || ""}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, stage: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as etapas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as etapas</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date range filter */}
            <div className="space-y-2">
              <Label>Período de criação</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !localFilters.dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dateFrom
                        ? format(localFilters.dateFrom, "dd/MM/yy", { locale: pt })
                        : "Data inicial"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dateFrom}
                      onSelect={(date) =>
                        setLocalFilters({ ...localFilters, dateFrom: date })
                      }
                      locale={pt}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !localFilters.dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.dateTo
                        ? format(localFilters.dateTo, "dd/MM/yy", { locale: pt })
                        : "Data final"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dateTo}
                      onSelect={(date) =>
                        setLocalFilters({ ...localFilters, dateTo: date })
                      }
                      locale={pt}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Value range filter (only for opportunities) */}
            {entityType === "opportunities" && (
              <div className="space-y-2">
                <Label>Intervalo de valor (€)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={localFilters.valueMin || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        valueMin: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={localFilters.valueMax || ""}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        valueMax: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* Tags filter */}
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar etiqueta..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {availableTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {availableTags.slice(0, 10).map((tag) => (
                    <Badge
                      key={tag}
                      variant={localFilters.tags?.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        if (localFilters.tags?.includes(tag)) {
                          handleRemoveTag(tag);
                        } else {
                          setLocalFilters({
                            ...localFilters,
                            tags: [...(localFilters.tags || []), tag],
                          });
                        }
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {localFilters.tags && localFilters.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground mr-1">Selecionadas:</span>
                  {localFilters.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
                      {tag}
                      <X
                        className="h-2 w-2 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Limpar filtros
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Aplicar filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
