import { useEffect, useState } from "react";
import { Coins, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaasAdminActions } from "@/hooks/useSaasAdminActions";

interface AssignCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  workspaceName?: string | null;
  currentBalance?: number | null;
  onSuccess?: () => void;
}

export function AssignCreditsDialog({
  open, onOpenChange, workspaceId, workspaceName, currentBalance, onSuccess,
}: AssignCreditsDialogProps) {
  const { assignCredits } = useSaasAdminActions();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setAmount("");
      setDescription("");
    }
  }, [open, workspaceId]);

  const numeric = Number(amount);
  const valid = amount !== "" && Number.isFinite(numeric) && numeric !== 0 && description.trim().length >= 3;
  const isRemoval = Number.isFinite(numeric) && numeric < 0;
  const preview =
    typeof currentBalance === "number" && Number.isFinite(numeric)
      ? currentBalance + numeric
      : null;

  const submit = () => {
    if (!workspaceId || !valid) return;
    assignCredits.mutate(
      { workspaceId, amount: numeric, description: description.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Gerir créditos
          </DialogTitle>
          <DialogDescription>
            Adicionar ou remover créditos manualmente do workspace <strong>{workspaceName ?? "—"}</strong>.
            {typeof currentBalance === "number" && (
              <>
                <br />
                Saldo atual: <strong>{currentBalance.toLocaleString("pt-PT")}</strong> créditos
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="v2-credits-amount">Quantidade de créditos</Label>
            <Input
              id="v2-credits-amount"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex.: 1000 para adicionar, -500 para remover"
            />
            <p className="text-xs text-muted-foreground">
              Use valores negativos para remover créditos.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="v2-credits-reason">Motivo / descrição</Label>
            <Textarea
              id="v2-credits-reason"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Oferta comercial de onboarding"
              rows={3}
              maxLength={300}
            />
          </div>

          {preview !== null && Number.isFinite(numeric) && numeric !== 0 && (
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              Novo saldo estimado: <strong>{preview.toLocaleString("pt-PT")}</strong> créditos
            </div>
          )}

          {isRemoval && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Está a remover créditos ao workspace. A ação fica registada em auditoria.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid || !workspaceId || assignCredits.isPending}>
            {assignCredits.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
