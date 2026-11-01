import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveRetainer, type ServiceRetainer } from "@/hooks/useRetainers";

const schema = z.object({
  name: z.string().trim().min(1, "Indique o nome").max(200),
  company_id: z.string().uuid("Escolha a empresa"),
  monthly_fee: z.number().min(0).max(1_000_000),
  included_hours: z.number().min(0).max(1000),
  overage_hourly_rate: z.number().min(0).max(10_000),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["active", "paused", "ended"]),
  notes: z.string().max(4000).nullable(),
});

export function RetainerFormDialog({ open, onOpenChange, retainer, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; retainer?: ServiceRetainer | null; onSaved?: (id: string) => void;
}) {
  const { currentWorkspace: ws } = useWorkspace();
  const save = useSaveRetainer();
  const [f, setF] = useState({ name: "", company_id: "", monthly_fee: "", included_hours: "", overage_hourly_rate: "", start_date: new Date().toISOString().slice(0, 10), status: "active", notes: "" });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF(retainer ? {
      name: retainer.name, company_id: retainer.company_id ?? "", monthly_fee: String(retainer.monthly_fee),
      included_hours: String(retainer.included_hours), overage_hourly_rate: String(retainer.overage_hourly_rate),
      start_date: retainer.start_date, status: retainer.status, notes: retainer.notes ?? "",
    } : { name: "", company_id: "", monthly_fee: "", included_hours: "", overage_hourly_rate: "", start_date: new Date().toISOString().slice(0, 10), status: "active", notes: "" });
  }, [open, retainer]);

  const { data: companies = [] } = useQuery({
    queryKey: ["retainer-companies", ws?.id],
    enabled: open && !!ws?.id,
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").eq("workspace_id", ws!.id).is("deleted_at", null).order("name").limit(2000);
      return data ?? [];
    },
  });

  const num = (s: string) => Number(String(s).replace(",", "."));
  const submit = () => {
    const parsed = schema.safeParse({
      name: f.name, company_id: f.company_id, monthly_fee: num(f.monthly_fee || "0"), included_hours: num(f.included_hours || "0"),
      overage_hourly_rate: num(f.overage_hourly_rate || "0"), start_date: f.start_date, status: f.status, notes: f.notes.trim() || null,
    });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    save.mutate({ id: retainer?.id, input: parsed.data as any }, { onSuccess: (id) => { onOpenChange(false); onSaved?.(id); } });
  };

  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{retainer ? "Editar avença" : "Nova avença mensal"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label htmlFor="r-name">Nome</Label><Input id="r-name" value={f.name} onChange={set("name")} placeholder="Ex: Gestão de campanhas e leads" maxLength={200} /></div>
          <div>
            <Label>Empresa cliente</Label>
            <Select value={f.company_id} onValueChange={set("company_id")}>
              <SelectTrigger><SelectValue placeholder="Escolher empresa" /></SelectTrigger>
              <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div><Label htmlFor="r-fee">Mensalidade (€)</Label><Input id="r-fee" inputMode="decimal" value={f.monthly_fee} onChange={set("monthly_fee")} /></div>
            <div><Label htmlFor="r-h">Horas/mês</Label><Input id="r-h" inputMode="decimal" value={f.included_hours} onChange={set("included_hours")} /></div>
            <div><Label htmlFor="r-rate">€/hora extra</Label><Input id="r-rate" inputMode="decimal" value={f.overage_hourly_rate} onChange={set("overage_hourly_rate")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="r-start">Início</Label><Input id="r-start" type="date" value={f.start_date} onChange={set("start_date")} /></div>
            <div>
              <Label>Estado</Label>
              <Select value={f.status} onValueChange={set("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem><SelectItem value="paused">Pausada</SelectItem><SelectItem value="ended">Terminada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label htmlFor="r-notes">Notas</Label><Textarea id="r-notes" rows={2} value={f.notes} onChange={set("notes")} maxLength={4000} /></div>
          <p className="text-xs text-muted-foreground">As horas reiniciam no dia 1 de cada mês e não passam para o mês seguinte. Acima do plafond, o tempo continua a ser registado como horas extra.</p>
          {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "A guardar..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
