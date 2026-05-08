import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLeadChefClientFollowUp } from "@/hooks/leadchef/useCreateLeadChefClientFollowUp";
import { useCompleteLeadChefAppointment } from "@/hooks/leadchef/useCompleteLeadChefAppointment";
import { useLeadChefClientFollowUps } from "@/hooks/leadchef/useLeadChefClientFollowUps";
import type { LeadChefClientDetail } from "@/hooks/leadchef/useLeadChefClient";

interface Props {
  client: LeadChefClientDetail;
}

export function LeadChefClientFollowUpCard({ client }: Props) {
  const [open, setOpen] = useState(false);
  const { data: followUps } = useLeadChefClientFollowUps(client.leadId);
  const create = useCreateLeadChefClientFollowUp();
  const complete = useCompleteLeadChefAppointment();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("Visita pós-venda");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const pendingPostSale = useMemo(
    () => (followUps ?? []).find((a) => a.type === "post_sale_visit" && a.status === "scheduled"),
    [followUps]
  );

  const handleCreate = async () => {
    if (!date) return;
    setSubmitting(true);
    try {
      await create.mutateAsync({
        leadId: client.leadId,
        profileId: client.profileId,
        type: "post_sale_visit",
        title,
        scheduled_at: new Date(date).toISOString(),
        notes,
        markPostSalePending: true,
      });
      setOpen(false);
      setDate(""); setNotes("");
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">Pós-venda</h2>
        </div>
        {!pendingPostSale ? (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Marcar pós-venda
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => complete.mutate({ appointment: pendingPostSale, outcome: "done" })}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
          </Button>
        )}
      </div>

      {pendingPostSale ? (
        <p className="text-sm text-slate-600">
          Próxima pós-venda · <span className="font-medium text-slate-900">
            {new Date(pendingPostSale.scheduled_at).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        </p>
      ) : (
        <p className="text-sm text-slate-500">Este cliente ainda não tem pós-venda marcada.</p>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left">
            <SheetTitle>Marcar pós-venda</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4 pb-4">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleCreate} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting || !date}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
