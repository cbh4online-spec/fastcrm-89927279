import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const db = supabase as any;

const BLOCKER_LABEL: Record<string, string> = {
  same_profile: "É o mesmo perfil.",
  archived_profile: "Um dos perfis já está arquivado.",
  different_contacts: "Os perfis estão ligados a contactos diferentes — consolide primeiro os contactos.",
  coincident_enrollments: "Há inscrições no mesmo curso/edição nos dois perfis — finanças e certificados não são juntos automaticamente.",
};
export const mergeBlockerLabel = (b: string) =>
  BLOCKER_LABEL[b] ?? (b.startsWith("unsupported_relation:") ? `Relação não suportada: ${b.slice(21)}` :
    b.startsWith("cross_workspace_dependent:") ? `Dados de outra organização em ${b.slice(26)}` : b);

const DEP_LABEL: Record<string, string> = {
  "sj_enrollments.profile_id": "Inscrições", "sj_touchpoints.profile_id": "Interações", "sj_tasks.profile_id": "Tarefas",
  "sj_automation_logs.profile_id": "Registos de automação", "sj_ai_suggestions.profile_id": "Sugestões",
  "sj_course_recommendations.profile_id": "Recomendações", attendance: "Presenças", certificates: "Certificados",
  installments: "Prestações", payments: "Pagamentos", invoice_links: "Faturas ligadas", provenance: "Registos de origem",
};

interface Props { open: boolean; onOpenChange: (v: boolean) => void; workspaceId: string; source: { id: string; full_name: string } }

/**
 * Consolidação segura: prévia obrigatória de dependências, motivo, e operação
 * transacional no servidor (sj_profile_merge). O perfil de origem é arquivado, nunca apagado.
 */
export function ProfileMergeDialog({ open, onOpenChange, workspaceId, source }: Props) {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const candidates = useQuery({
    queryKey: ["sj-merge-candidates", workspaceId, term],
    enabled: open && term.trim().length >= 2,
    queryFn: async () => {
      const t = term.trim().replace(/[%,()]/g, " ");
      const { data, error } = await db.from("sj_profiles").select("id, full_name, email, phone, contact_id")
        .eq("workspace_id", workspaceId).is("archived_at", null).neq("id", source.id)
        .or(`full_name.ilike.%${t}%,email.ilike.%${t}%,phone.ilike.%${t}%`).limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  const reset = () => { setTerm(""); setTargetId(null); setPreview(null); setReason(""); };

  async function loadPreview(id: string) {
    setTargetId(id); setPreview(null); setBusy(true);
    const { data, error } = await db.rpc("sj_profile_merge_preview", { _workspace_id: workspaceId, _source: source.id, _target: id });
    setBusy(false);
    if (error) { toast.error(`Não foi possível preparar a prévia: ${error.message}`); return; }
    setPreview(data);
  }

  async function confirm() {
    if (!targetId || !preview?.can_merge) return;
    setBusy(true);
    const { data, error } = await db.rpc("sj_profile_merge", { _workspace_id: workspaceId, _source: source.id, _target: targetId, _reason: reason.trim() });
    setBusy(false);
    if (error) { toast.error(`Consolidação recusada: ${error.message}`); return; }
    if (data?.status !== "completed") {
      toast.error("Consolidação bloqueada e registada para revisão. Nada foi alterado.");
      setPreview({ ...preview, can_merge: false, blockers: data?.blockers ?? [] });
      return;
    }
    toast.success("Perfil consolidado. O perfil de origem ficou arquivado e pode ser revertido.");
    qc.invalidateQueries({ queryKey: ["sj-profiles"] });
    qc.invalidateQueries({ queryKey: ["sj-profile"] });
    onOpenChange(false); reset();
  }

  const deps = useMemo(() => Object.entries(preview?.dependencies ?? {}).filter(([, n]) => Number(n) > 0), [preview]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consolidar «{source.full_name}» noutro perfil</DialogTitle>
          <DialogDescription>Os dados passam para o perfil escolhido. Este perfil fica arquivado (não é apagado) e a operação pode ser revertida.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="merge-search">Perfil de destino</Label>
            <Input id="merge-search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Pesquisar por nome, e-mail ou telefone" />
            {candidates.data && (
              <ul className="max-h-40 overflow-auto rounded-md border border-border">
                {candidates.data.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => loadPreview(c.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 ${targetId === c.id ? "bg-muted" : ""}`}>
                      <span className="font-medium">{c.full_name}</span> <span className="text-muted-foreground">{c.email || c.phone || ""}</span>
                    </button>
                  </li>
                ))}
                {!candidates.data.length && <li className="px-3 py-2 text-sm text-muted-foreground">Sem resultados.</li>}
              </ul>
            )}
          </div>
          {busy && !preview && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />A preparar a prévia…</p>}
          {preview && (
            <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
              <p><b>{preview.source.full_name}</b> → <b>{preview.target.full_name}</b></p>
              {!preview.names_compatible && <p className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Os nomes não são compatíveis — confirme que é mesmo a mesma pessoa.</p>}
              <p className="text-muted-foreground">A mover: {deps.length ? deps.map(([k, n]) => `${DEP_LABEL[k] ?? k}: ${n}`).join(" · ") : "nenhum registo dependente"}</p>
              {preview.blockers?.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-destructive">{preview.blockers.map((b: string) => <li key={b}>{mergeBlockerLabel(b)}</li>)}</ul>
              )}
              {preview.can_merge && (
                <div className="space-y-1">
                  <Label htmlFor="merge-reason">Motivo (obrigatório)</Label>
                  <Textarea id="merge-reason" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: mesmo NIF e e-mail confirmados pela secretaria" />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!preview?.can_merge || reason.trim().length < 5 || busy} onClick={confirm}>
            {busy && preview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Consolidar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
