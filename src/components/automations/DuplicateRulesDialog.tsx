import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, CopyCheck } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { DuplicateRuleGroup } from "@/lib/automations/detectDuplicateRules";
import { useDeleteAutomationRules } from "@/hooks/useAutomations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: DuplicateRuleGroup[];
  executionsByRule: Record<string, number>;
}

export function DuplicateRulesDialog({ open, onOpenChange, groups, executionsByRule }: Props) {
  const deleteRules = useDeleteAutomationRules();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Pré-seleciona todas as cópias exceto a sugerida para manter
  useEffect(() => {
    if (!open) return;
    const next = new Set<string>();
    for (const group of groups) {
      for (const rule of group.rules) {
        if (rule.id !== group.keepId) next.add(rule.id);
      }
    }
    setSelected(next);
  }, [open, groups]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selected.size;

  const blockedGroups = useMemo(
    () => groups.filter((g) => g.rules.every((r) => selected.has(r.id))),
    [groups, selected]
  );

  const handleDelete = async () => {
    await deleteRules.mutateAsync(Array.from(selected));
    setConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CopyCheck className="h-5 w-5 text-amber-500" />
              Rever regras duplicadas
            </DialogTitle>
            <DialogDescription>
              Regras com o mesmo nome e gatilho no workspace atual. Mantenha apenas uma por grupo
              para evitar execuções repetidas. A sugestão inicial mantém a regra com mais
              execuções, mais ações ou mais antiga.
            </DialogDescription>
          </DialogHeader>

          {groups.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Não existem regras duplicadas.
            </div>
          ) : (
            <ScrollArea className="max-h-[55vh] pr-3">
              <div className="space-y-5">
                {groups.map((group) => (
                  <div key={group.key} className="rounded-lg border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Gatilho: <span className="font-mono">{group.trigger}</span>
                        </p>
                      </div>
                      <Badge variant="outline">{group.rules.length} cópias</Badge>
                    </div>

                    <ul className="divide-y">
                      {group.rules.map((rule) => {
                        const state = (rule as unknown as { state?: string }).state ?? "—";
                        const execs = executionsByRule[rule.id] ?? 0;
                        const isKeep = rule.id === group.keepId;
                        return (
                          <li key={rule.id} className="flex items-start gap-3 px-4 py-3">
                            <Checkbox
                              id={`dup-${rule.id}`}
                              checked={selected.has(rule.id)}
                              onCheckedChange={() => toggle(rule.id)}
                              aria-label={`Selecionar cópia criada em ${rule.created_at}`}
                              className="mt-1"
                            />
                            <label
                              htmlFor={`dup-${rule.id}`}
                              className="flex-1 cursor-pointer space-y-1"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm">
                                  Criada em{" "}
                                  {format(new Date(rule.created_at), "dd/MM/yyyy HH:mm", {
                                    locale: pt,
                                  })}
                                </span>
                                {isKeep && (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">
                                    Sugerida para manter
                                  </Badge>
                                )}
                                <Badge variant={rule.is_active ? "default" : "secondary"}>
                                  {rule.is_active ? "Ativa" : "Inativa"}
                                </Badge>
                                <Badge variant="outline">{state}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {rule.actions?.length ?? 0} ações · {rule.conditions?.length ?? 0}{" "}
                                condições · {execs} execuções
                              </p>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {blockedGroups.length > 0 && (
            <p className="text-xs text-destructive">
              Selecionou todas as cópias de {blockedGroups.length} grupo(s). Mantenha pelo menos
              uma regra por grupo.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              variant="destructive"
              disabled={
                selectedCount === 0 || blockedGroups.length > 0 || deleteRules.isPending
              }
              onClick={() => setConfirmOpen(true)}
            >
              {deleteRules.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar {selectedCount} selecionada(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedCount} regra(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e remove também as condições e ações associadas a essas
              regras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
