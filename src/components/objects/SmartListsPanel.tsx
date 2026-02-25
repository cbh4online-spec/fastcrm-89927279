import { useState, useMemo } from "react";
import { useSavedViews, useCreateSavedView, useDeleteSavedView, SavedView } from "@/hooks/useSavedViews";
import { AdvancedFilterBuilder } from "@/components/objects/AdvancedFilterBuilder";
import { SaveAsListDialog } from "@/components/objects/SaveAsListDialog";
import { FilterCondition, FilterableField, applyFilters } from "@/hooks/useFilterEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Plus, Trash2, Eye, Save, ListTodo } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Props {
  entityType: string;
  fields: FilterableField[];
  records: Record<string, unknown>[];
  onFilteredRecords?: (records: Record<string, unknown>[]) => void;
  className?: string;
}

export function SmartListsPanel({ entityType, fields, records, onFilteredRecords, className }: Props) {
  const { data: savedViews, isLoading } = useSavedViews(entityType);
  const deleteSavedView = useDeleteSavedView();
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const lists = useMemo(() => {
    return (savedViews || []).filter((v) => {
      const f = v.filters as any;
      return f && Array.isArray(f.conditions) && f.conditions.length > 0;
    });
  }, [savedViews]);

  const filteredRecords = useMemo(() => {
    const result = applyFilters(records, conditions, "AND");
    onFilteredRecords?.(result);
    return result;
  }, [records, conditions]);

  const handleSelectList = (view: SavedView) => {
    if (activeListId === view.id) {
      setActiveListId(null);
      setConditions([]);
      return;
    }
    setActiveListId(view.id);
    const f = view.filters as any;
    setConditions(f?.conditions || []);
  };

  const handleDeleteList = (view: SavedView) => {
    deleteSavedView.mutate({ id: view.id, entity_type: entityType });
    if (activeListId === view.id) {
      setActiveListId(null);
      setConditions([]);
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Saved lists */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Listas Guardadas</h3>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma lista inteligente criada. Adicione filtros abaixo e guarde como lista.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {lists.map((list) => {
                const filterCount = ((list.filters as any)?.conditions || []).length;
                return (
                  <div key={list.id} className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={activeListId === list.id ? "default" : "outline"}
                      onClick={() => handleSelectList(list)}
                      className="gap-1.5"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      {list.name}
                      <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">{filterCount}</Badge>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteList(list)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter builder */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Construir Filtro</h3>
          <AdvancedFilterBuilder
            fields={fields}
            conditions={conditions}
            onChange={(c) => { setConditions(c); setActiveListId(null); }}
          />
        </div>

        {/* Results summary + save */}
        {conditions.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
            <span className="text-sm">
              <strong>{filteredRecords.length}</strong> registo(s) correspondem aos filtros
            </span>
            <Button size="sm" variant="outline" className="gap-1.5 ml-auto" onClick={() => setShowSaveDialog(true)}>
              <Save className="h-3.5 w-3.5" />
              Guardar como Lista
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConditions([])}>
              Limpar
            </Button>
          </div>
        )}
      </div>

      <SaveAsListDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        conditions={conditions}
        entityType={entityType}
      />
    </div>
  );
}
