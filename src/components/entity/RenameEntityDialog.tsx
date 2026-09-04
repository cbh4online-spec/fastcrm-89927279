import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { entityNameSchema } from "./EditableEntityTitle";
import { ENTITY_LABEL, type ArchivableEntity } from "@/hooks/useEntityArchiveBlock";

const TABLE_BY_ENTITY: Record<ArchivableEntity, "contacts" | "companies" | "leads"> = {
  contact: "contacts",
  company: "companies",
  lead: "leads",
};

const INVALIDATE_KEYS = [
  "contacts", "companies", "leads",
  "smart-contacts", "smart-companies", "smart-leads",
  "contact", "company", "lead",
];

export interface RenameEntityTarget {
  id: string;
  name: string;
}

interface RenameEntityDialogProps {
  entity: ArchivableEntity;
  target: RenameEntityTarget | null;
  onOpenChange: (open: boolean) => void;
}

/** Diálogo reutilizável para renomear leads, contactos e empresas a partir das listagens. */
export function RenameEntityDialog({ entity, target, onOpenChange }: RenameEntityDialogProps) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [name, setName] = useState(target?.name ?? "");
  const label = ENTITY_LABEL[entity];

  useEffect(() => {
    setName(target?.name ?? "");
  }, [target]);

  const rename = useMutation({
    mutationFn: async (newName: string) => {
      if (!target || !currentWorkspace) throw new Error("Registo inválido.");
      const { error } = await supabase
        .from(TABLE_BY_ENTITY[entity])
        .update({ name: newName })
        .eq("id", target.id)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      INVALIDATE_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`${label} renomeado`);
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível renomear."),
  });

  const submit = () => {
    const parsed = entityNameSchema.safeParse(name);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Nome inválido.");
      return;
    }
    if (parsed.data === target?.name) {
      onOpenChange(false);
      return;
    }
    rename.mutate(parsed.data);
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renomear {label.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Altera o nome apresentado em todo o sistema. As restantes informações mantêm-se.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rename-entity-name">Nome</Label>
          <Input
            id="rename-entity-name"
            value={name}
            maxLength={150}
            autoFocus
            disabled={rename.isPending}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={rename.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={rename.isPending}>
            {rename.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
