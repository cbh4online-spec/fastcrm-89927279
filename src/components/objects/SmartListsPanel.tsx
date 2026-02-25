import { useState, useMemo } from "react";
import { useSavedViews, useCreateSavedView, useDeleteSavedView, SavedView } from "@/hooks/useSavedViews";
import { AdvancedFilterBuilder } from "@/components/objects/AdvancedFilterBuilder";
import { SaveAsListDialog } from "@/components/objects/SaveAsListDialog";
import { FilterCondition, FilterableField, applyFilters } from "@/hooks/useFilterEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Trash2, Save, Loader2 } from "lucide-react";

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
        {/* Saved lists as pills */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : lists.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lists.map((list) => {
              const filterCount = ((list.filters as any)?.conditions || []).length;
              return (
                <div key={list.id} className="flex items-center group">
                  <Button
                    size="sm"
                    variant={activeListId === list.id ? "default" : "outline"}
                    onClick={() => handleSelectList(list)}
                    className="gap-1.5 text-xs"
                  >
                    <Filter className="h-3 w-3" />
                    {list.name}
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">{filterCount}</Badge>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 ml-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity duration-150"
                    onClick={() => handleDeleteList(list)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter builder */}
        <AdvancedFilterBuilder
          fields={fields}
          conditions={conditions}
          onChange={(c) => { setConditions(c); setActiveListId(null); }}
        />

        {/* Results summary */}
        {conditions.length > 0 && (
          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 border border-border/30 text-sm">
            <span>
              <strong>{filteredRecords.length}</strong> registo(s)
            </span>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs ml-auto" onClick={() => setShowSaveDialog(true)}>
              <Save className="h-3 w-3" />
              Guardar
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConditions([])}>
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
