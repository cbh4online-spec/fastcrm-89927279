import { useState } from "react";
import { useCoreObjectViews, useCreateObjectView, useDeleteObjectView, CoreObjectView } from "@/hooks/useCoreObjectFields";
import { useCoreObjectFields } from "@/hooks/useCoreObjectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Loader2, Eye, Filter, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FilterCondition } from "@/hooks/useFilterEngine";

interface Props {
  objectId: string;
  activeViewId: string | null;
  onSelectView: (view: CoreObjectView | null) => void;
  onFiltersFromView?: (conditions: FilterCondition[]) => void;
}

function viewHasFilters(view: CoreObjectView): boolean {
  const f = view.filters as any;
  return f && Array.isArray(f.conditions) && f.conditions.length > 0;
}

function getFilterCount(view: CoreObjectView): number {
  const f = view.filters as any;
  if (f && Array.isArray(f.conditions)) return f.conditions.length;
  return 0;
}

export function ObjectViewsManager({ objectId, activeViewId, onSelectView, onFiltersFromView }: Props) {
  const { data: views, isLoading } = useCoreObjectViews(objectId);
  const { data: fields } = useCoreObjectFields(objectId);
  const createView = useCreateObjectView();
  const deleteView = useDeleteObjectView();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    createView.mutate(
      { object_id: objectId, name: newName, visible_fields: selectedFields.length > 0 ? selectedFields : undefined },
      { onSuccess: () => { setShowAdd(false); setNewName(""); setSelectedFields([]); } }
    );
  };

  const handleSelectView = (view: CoreObjectView) => {
    onSelectView(view);
    if (onFiltersFromView && viewHasFilters(view)) {
      const f = view.filters as any;
      onFiltersFromView(f.conditions || []);
    } else if (onFiltersFromView) {
      onFiltersFromView([]);
    }
  };

  const toggleField = (slug: string) => {
    setSelectedFields((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
  };

  if (isLoading) return <div className="flex items-center py-1"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button size="sm" variant={activeViewId === null ? "default" : "ghost"} className="h-7 text-xs gap-1.5 px-2.5" onClick={() => { onSelectView(null); onFiltersFromView?.([]); }}>
        <Eye className="h-3 w-3" /> Todos
      </Button>
      {views?.map((view) => {
        const hasFilters = viewHasFilters(view);
        const filterCount = getFilterCount(view);
        return (
          <div key={view.id} className="flex items-center group">
            <Button size="sm" variant={activeViewId === view.id ? "default" : "ghost"} className="h-7 text-xs gap-1.5 px-2.5" onClick={() => handleSelectView(view)}>
              {hasFilters ? <Filter className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {view.name}
              {hasFilters && (
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">{filterCount}</Badge>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity duration-150"
              onClick={() => { deleteView.mutate({ id: view.id, object_id: objectId }); if (activeViewId === view.id) { onSelectView(null); onFiltersFromView?.([]); } }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      })}

      <Popover open={showAdd} onOpenChange={setShowAdd}>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 px-2 text-muted-foreground">
            <Plus className="h-3 w-3" /> View
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome da View</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Visão geral" className="h-8 text-xs mt-1" />
            </div>
            {fields && fields.length > 0 && (
              <div>
                <Label className="text-xs">Campos visíveis</Label>
                <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                  {fields.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-xs">
                      <Checkbox checked={selectedFields.includes(f.slug)} onCheckedChange={() => toggleField(f.slug)} />
                      {f.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button size="sm" className="w-full text-xs" onClick={handleAdd} disabled={!newName.trim() || createView.isPending}>
              {createView.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Criar View
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
