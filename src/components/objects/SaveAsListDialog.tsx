import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { FilterCondition } from "@/hooks/useFilterEngine";
import { useCreateObjectView } from "@/hooks/useCoreObjectFields";
import { useCreateSavedView } from "@/hooks/useSavedViews";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conditions: FilterCondition[];
  /** For custom objects */
  objectId?: string;
  /** For core entities */
  entityType?: string;
  visibleFields?: string[];
  sortConfig?: Record<string, unknown>;
}

export function SaveAsListDialog({ open, onOpenChange, conditions, objectId, entityType, visibleFields, sortConfig }: Props) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const createObjectView = useCreateObjectView();
  const createSavedView = useCreateSavedView();

  const isPending = createObjectView.isPending || createSavedView.isPending;

  const handleSave = () => {
    if (!name.trim()) return;

    const filtersJson = { conditions, logic: "AND" };

    if (objectId) {
      createObjectView.mutate(
        {
          object_id: objectId,
          name: name.trim(),
          visible_fields: visibleFields,
          filters: filtersJson as any,
          sort_config: sortConfig,
          is_default: isDefault,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setName("");
            setIsDefault(false);
            setIsShared(false);
          },
        }
      );
    } else if (entityType) {
      createSavedView.mutate(
        {
          name: name.trim(),
          entity_type: entityType,
          filters: filtersJson as any,
          sort_config: sortConfig,
          visible_columns: visibleFields,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setName("");
            setIsDefault(false);
            setIsShared(false);
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guardar como Lista</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Nome da lista</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Deals sem atividade há 14 dias"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} />
              Definir como vista padrão
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isShared} onCheckedChange={(v) => setIsShared(!!v)} />
              Partilhar com workspace
            </label>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {conditions.length} condição(ões) de filtro serão guardadas. A lista é dinâmica — registos entram e saem automaticamente.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Guardar Lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
