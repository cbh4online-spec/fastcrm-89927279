import { useEffect, useState } from "react";
import { ArrowUpCircle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useSaasAdminActions, SAAS_PLAN_OPTIONS, SAAS_STATUS_OPTIONS,
} from "@/hooks/useSaasAdminActions";

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  workspaceName?: string | null;
  currentPlan?: string | null;
  currentStatus?: string | null;
  onSuccess?: () => void;
}

export function ChangePlanDialog({
  open, onOpenChange, workspaceId, workspaceName, currentPlan, currentStatus, onSuccess,
}: ChangePlanDialogProps) {
  const { changePlan } = useSaasAdminActions();
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [trialEnd, setTrialEnd] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  useEffect(() => {
    if (open) {
      setPlan("");
      setStatus("");
      setTrialEnd("");
      setPeriodEnd("");
    }
  }, [open, workspaceId]);

  const submit = () => {
    if (!workspaceId) return;
    changePlan.mutate(
      {
        workspaceId,
        plan: plan || currentPlan || "starter",
        subStatus: status || undefined,
        trialEnd: trialEnd ? new Date(trialEnd).toISOString() : undefined,
        periodEnd: periodEnd ? new Date(periodEnd).toISOString() : undefined,
      },
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
            Alterar plano e subscrição
          </DialogTitle>
          <DialogDescription>
            Workspace: <strong>{workspaceName ?? "—"}</strong>
            <br />
            Plano atual: <strong className="capitalize">{currentPlan || "free"}</strong>
            {" · "}Estado: <strong className="capitalize">{currentStatus || "active"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger><SelectValue placeholder="Manter atual" /></SelectTrigger>
                <SelectContent>
                  {SAAS_PLAN_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado da subscrição</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  if (v === "trialing" && !trialEnd) {
                    setTrialEnd(
                      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
                    );
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Manter atual" /></SelectTrigger>
                <SelectContent>
                  {SAAS_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === "trialing" ? (
            <div className="space-y-2">
              <Label htmlFor="v2-trial-end">Data de fim do trial</Label>
              <Input
                id="v2-trial-end"
                type="date"
                value={trialEnd}
                onChange={(e) => setTrialEnd(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Por defeito: 14 dias a partir de hoje.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="v2-period-end">Data de fim do período (renovação)</Label>
              <Input
                id="v2-period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Deixar vazio para manter a data atual.</p>
            </div>
          )}

          <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Alteração administrativa local: não sincroniza automaticamente com o Stripe.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={(!plan && !status) || !workspaceId || changePlan.isPending}
          >
            {changePlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
