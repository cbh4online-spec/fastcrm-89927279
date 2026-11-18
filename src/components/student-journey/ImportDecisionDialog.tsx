import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { acceptableContacts, reasonLabel, type PreviewRow } from "@/lib/studentJourney/importReconciliation";

const db = supabase as any;
const MATCH_LABEL: Record<string, string> = { nif: "NIF", email: "e-mail", phone: "telefone", client_number: "nº cliente", previous_import: "importação anterior", phone_hint: "telefone no e-mail", name_only: "só nome" };

interface Props {
  open: boolean; onOpenChange: (v: boolean) => void; workspaceId: string; cohortId: string;
  batch: Record<string, string>; row: Record<string, unknown>; preview: PreviewRow; onSaved: () => void;
}

/**
 * Decisão manual de conciliação: só entre candidatos aceitáveis, com motivo.
 * Fica registada no servidor (utilizador, motivo, linha, impressão digital dos dados)
 * e é revalidada no momento da importação.
 */
export function ImportDecisionDialog({ open, onOpenChange, workspaceId, cohortId, batch, row, preview, onSaved }: Props) {
  const okContacts = acceptableContacts(preview);
  const blocked = preview.contacts.filter((c) => !okContacts.includes(c));
  const [contact, setContact] = useState<string>(preview.resolution?.contact ?? (okContacts.length === 1 ? okContacts[0].id : preview.contacts.length ? "" : "new"));
  const [profile, setProfile] = useState<string>(preview.resolution?.profile ?? "");
  const [legacy, setLegacy] = useState<string>(preview.resolution?.legacy ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const profileOptions = preview.profiles.filter((p) => p.name_ok && (!p.contact_id || p.contact_id === contact));
  const contactProfile = preview.profiles.find((p) => p.contact_id === contact);
  const canNewProfile = preview.profiles.length === 0;
  const needsLegacy = preview.legacy_enrollments.length > 0 && !preview.existing_in_cohort.length;

  async function save() {
    setBusy(true);
    const { error } = await db.rpc("sj_import_record_decision", {
      _workspace_id: workspaceId, _batch: batch, _row: row,
      _decision: { contact, profile, cohort_id: cohortId, legacy: needsLegacy ? legacy || null : null }, _reason: reason.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message.replace(/^Decisão recusada: /, "Recusado: ").replace(/(conflict:\w+|[a-z_]+_[a-z_]+)$/, (m) => reasonLabel(m))); return; }
    toast.success("Decisão registada."); onSaved();
  }

  const valid = contact && profile && reason.trim().length >= 5 && (!needsLegacy || legacy) && (!contactProfile || profile === contactProfile.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Decidir linha {preview.source_row}</DialogTitle>
          <DialogDescription>{preview.resolution?.pending ? reasonLabel(preview.resolution.pending) : "Confirme o aluno e a inscrição antiga."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <fieldset className="space-y-2">
            <legend className="font-medium">Contacto</legend>
            <RadioGroup value={contact} onValueChange={(v) => { setContact(v); setProfile(""); }}>
              {okContacts.map((c) => (
                <div key={c.id} className="flex items-center gap-2"><RadioGroupItem value={c.id} id={`c-${c.id}`} />
                  <Label htmlFor={`c-${c.id}`} className="font-normal">{c.name} · {c.email || c.phone || c.tax_id || "—"} <span className="text-muted-foreground">({c.matched_by.map((m) => MATCH_LABEL[m] ?? m).join(", ")})</span></Label></div>
              ))}
              {preview.contacts.length === 0 && (
                <div className="flex items-center gap-2"><RadioGroupItem value="new" id="c-new" /><Label htmlFor="c-new" className="font-normal">Criar contacto novo</Label></div>
              )}
            </RadioGroup>
            {blocked.length > 0 && <p className="text-muted-foreground">Não selecionáveis (conflito): {blocked.map((c) => c.name).join(", ")}</p>}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-medium">Perfil de aluno</legend>
            <RadioGroup value={profile} onValueChange={setProfile}>
              {profileOptions.map((p) => (
                <div key={p.id} className="flex items-center gap-2"><RadioGroupItem value={p.id} id={`p-${p.id}`} />
                  <Label htmlFor={`p-${p.id}`} className="font-normal">{p.full_name} · {p.email || p.phone || "—"} · {p.enrollments} inscrições {p.contact_id ? "" : "(sem contacto)"}</Label></div>
              ))}
              {canNewProfile && <div className="flex items-center gap-2"><RadioGroupItem value="new" id="p-new" /><Label htmlFor="p-new" className="font-normal">Criar perfil novo</Label></div>}
            </RadioGroup>
            {!canNewProfile && <p className="text-muted-foreground">Existe pelo menos um perfil candidato: não é criado outro. Se forem duplicados, consolide-os primeiro.</p>}
          </fieldset>
          {needsLegacy && (
            <fieldset className="space-y-2">
              <legend className="font-medium">Inscrição antiga no mesmo curso, sem edição</legend>
              <RadioGroup value={legacy} onValueChange={setLegacy}>
                {preview.legacy_enrollments.map((e) => (
                  <div key={e.id} className="flex items-center gap-2"><RadioGroupItem value={e.id} id={`l-${e.id}`} />
                    <Label htmlFor={`l-${e.id}`} className="font-normal">Associar esta inscrição à edição (criada {new Date(e.created_at).toLocaleDateString("pt-PT")}, pedagógico: {e.pedagogic_status ?? "—"})</Label></div>
                ))}
                <div className="flex items-center gap-2"><RadioGroupItem value="separate" id="l-sep" /><Label htmlFor="l-sep" className="font-normal">É outra edição — criar inscrição separada</Label></div>
              </RadioGroup>
              <p className="text-muted-foreground">Sem evidência da edição, deixe pendente (feche esta janela).</p>
            </fieldset>
          )}
          <div className="space-y-1">
            <Label htmlFor="dec-reason">Motivo (obrigatório)</Label>
            <Textarea id="dec-reason" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: confirmado por telefone com a formanda" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Deixar pendente</Button>
          <Button disabled={!valid || busy} onClick={save}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registar decisão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
