import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateLeadChefReferral } from "@/hooks/leadchef/useCreateLeadChefReferral";
import { buildLeadChefMessage } from "@/utils/leadchef/messageTemplates";
import { LEADCHEF_AUTHORIZATION_STATUSES, LEADCHEF_AUTHORIZATION_STATUS_LABELS } from "./constants";
import type { LeadChefClientDetail } from "@/hooks/leadchef/useLeadChefClient";
import type { LeadChefAuthorizationStatus } from "@/types/leadchef";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: LeadChefClientDetail;
}

type Outcome = "asked" | "received" | "later" | "refused";

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "asked", label: "Pediu referência" },
  { value: "received", label: "Deu referência" },
  { value: "later", label: "Pediu para falar mais tarde" },
  { value: "refused", label: "Recusou" },
];

export function LeadChefClientReferralRequestSheet({ open, onOpenChange, client }: Props) {
  const create = useCreateLeadChefReferral();
  const [outcome, setOutcome] = useState<Outcome>("asked");
  const [refName, setRefName] = useState("");
  const [refPhone, setRefPhone] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [auth, setAuth] = useState<LeadChefAuthorizationStatus>("unknown");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const message = buildLeadChefMessage("referral_request", { leadName: client.name });

  const handleSubmit = async () => {
    if (outcome === "received" && refName.trim().length < 2) return;
    setSubmitting(true);
    try {
      if (outcome === "received") {
        await create.mutateAsync({
          name: refName,
          phone: refPhone,
          email: refEmail,
          referred_by_lead_id: client.leadId,
          authorization_status: auth,
          notes,
        });
      }
      onOpenChange(false);
      setRefName(""); setRefPhone(""); setRefEmail(""); setNotes("");
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Pedir referência · {client.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-4 pb-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 whitespace-pre-line">
            {message}
          </div>

          <div className="space-y-1">
            <Label>Resultado</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {outcome === "received" && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
              <div className="space-y-1">
                <Label>Nome da referência *</Label>
                <Input value={refName} onChange={(e) => setRefName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input type="tel" value={refPhone} onChange={(e) => setRefPhone(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={refEmail} onChange={(e) => setRefEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Autorização</Label>
                <Select value={auth} onValueChange={(v) => setAuth(v as LeadChefAuthorizationStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEADCHEF_AUTHORIZATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{LEADCHEF_AUTHORIZATION_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={submitting || (outcome === "received" && refName.trim().length < 2)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {outcome === "received" ? "Guardar referência" : "Registar"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
