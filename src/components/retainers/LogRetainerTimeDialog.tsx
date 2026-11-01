import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLogRetainerTime, type ServiceRetainer } from "@/hooks/useRetainers";
import { lisbonDate, parseDurationInput } from "@/lib/retainers/retainerUsage";

export function LogRetainerTimeDialog({ open, onOpenChange, retainer, projects, tickets }: {
  open: boolean; onOpenChange: (o: boolean) => void; retainer: ServiceRetainer;
  projects: { id: string; title: string }[]; tickets: { id: string; subject: string; ticket_number?: string | null }[];
}) {
  const log = useLogRetainerTime();
  const [target, setTarget] = useState("");
  const [date, setDate] = useState(lisbonDate(new Date().toISOString()));
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (open) { setErr(null); setDuration(""); setDescription(""); setBillable(true); } }, [open]);

  const isProject = target.startsWith("p:");
  const submit = () => {
    const minutes = parseDurationInput(duration);
    if (!target) return setErr("Escolha o projeto ou ticket");
    if (!minutes || minutes <= 0) return setErr("Duração inválida. Ex: 1:30, 1h30 ou 45m");
    if (!description.trim()) return setErr("Descreva o trabalho feito");
    log.mutate({
      retainer, kind: isProject ? "project" : "ticket", parentId: target.slice(2), date, minutes,
      description, billable: isProject ? billable : true,
    }, { onSuccess: () => onOpenChange(false) });
  };

  const empty = projects.length === 0 && tickets.length === 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registar tempo</DialogTitle></DialogHeader>
        {empty ? (
          <p className="text-sm text-muted-foreground">Ligue primeiro um projeto ou um ticket de suporte a esta avença.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Onde foi feito</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue placeholder="Escolher projeto ou ticket" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={`p:${p.id}`}>Projeto · {p.title}</SelectItem>)}
                  {tickets.map((t) => <SelectItem key={t.id} value={`t:${t.id}`}>Suporte · {t.ticket_number ? `#${t.ticket_number} ` : ""}{t.subject}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="lt-date">Data</Label><Input id="lt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label htmlFor="lt-dur">Duração</Label><Input id="lt-dur" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="1:30" /></div>
            </div>
            <div><Label htmlFor="lt-desc">O que foi feito</Label><Textarea id="lt-desc" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Otimização das campanhas Meta e revisão de leads" /></div>
            {isProject && (
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="lt-bill">Conta para a avença</Label>
                <Switch id="lt-bill" checked={billable} onCheckedChange={setBillable} />
              </div>
            )}
            {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {!empty && <Button onClick={submit} disabled={log.isPending}>{log.isPending ? "A registar..." : "Registar"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
