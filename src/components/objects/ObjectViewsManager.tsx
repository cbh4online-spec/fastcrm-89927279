import { useState } from "react";
import { useCoreObjectViews, useCreateObjectView, useDeleteObjectView, CoreObjectView } from "@/hooks/useCoreObjectFields";
import { useCoreObjectFields } from "@/hooks/useCoreObjectFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  objectId: string;
  activeViewId: string | null;
  onSelectView: (view: CoreObjectView | null) => void;
}

export function ObjectViewsManager({ objectId, activeViewId, onSelectView }: Props) {
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

  const toggleField = (slug: string) => {
    setSelectedFields((prev) => prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
  };

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Views</h4>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nova View
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label>Nome da View</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Visão geral" />
            </div>
            {fields && fields.length > 0 && (
              <div>
                <Label>Campos visíveis</Label>
                <div className="space-y-1 mt-1">
                  {fields.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={selectedFields.includes(f.slug)} onCheckedChange={() => toggleField(f.slug)} />
                      {f.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || createView.isPending}>
              {createView.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Criar View
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={activeViewId === null ? "default" : "outline"} onClick={() => onSelectView(null)} className="gap-1.5">
          <Eye className="h-3.5 w-3.5" /> Todos
        </Button>
        {views?.map((view) => (
          <div key={view.id} className="flex items-center gap-1">
            <Button size="sm" variant={activeViewId === view.id ? "default" : "outline"} onClick={() => onSelectView(view)} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> {view.name}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => { deleteView.mutate({ id: view.id, object_id: objectId }); if (activeViewId === view.id) onSelectView(null); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
