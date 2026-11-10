import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PhoneIncoming, PhoneOutgoing, Sparkles, Loader2, ListPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCloudtalk, useCloudtalkCalls, useGenerateCallSummary } from "@/hooks/useCloudtalk";

const fmtDur = (s: number | null) => (s == null ? "—" : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);
const SENTIMENT: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  positive: { label: "Positivo", variant: "default" },
  neutral: { label: "Neutro", variant: "secondary" },
  negative: { label: "Negativo", variant: "destructive" },
};
const SPEAKER = { agent: "Agente", customer: "Cliente", unknown: "Interlocutor" } as const;
type Segment = { speaker: keyof typeof SPEAKER; text: string };
const TASK_DUE_DAYS = 3;

function useCreateCallTask(related: { type: "contact" | "lead"; id: string }) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  return async (title: string) => {
    const wsId = currentWorkspace?.id;
    const { data: { user } } = await supabase.auth.getUser();
    if (!wsId || !user) throw new Error("Sessão expirada");
    const t = title.slice(0, 200);
    const { data: existing, error: readErr } = await supabase.from("tasks").select("id")
      .eq("workspace_id", wsId).eq("status", "pending").eq("related_id", related.id).eq("title", t).limit(1);
    if (readErr) throw readErr;
    if (existing?.length) return false;
    const { error } = await supabase.from("tasks").insert({
      workspace_id: wsId, created_by: user.id, assigned_to: user.id, related_type: related.type, related_id: related.id,
      title: t, description: "Próximo passo combinado numa chamada CloudTalk.", status: "pending", priority: "medium",
      due_at: new Date(Date.now() + TASK_DUE_DAYS * 86_400_000).toISOString(),
    } as never);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["tasks"] });
    return true;
  };
}

export function CloudtalkCallHistory({ contactId, leadId }: { contactId?: string; leadId?: string }) {
  const { moduleActive, status } = useCloudtalk();
  const calls = useCloudtalkCalls({ contactId, leadId });
  const generate = useGenerateCallSummary();
  const related = contactId ? { type: "contact" as const, id: contactId } : { type: "lead" as const, id: leadId ?? "" };
  const createTask = useCreateCallTask(related);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  if (!moduleActive) return null;
  const manager = !!status.data?.manager;

  const onTask = async (key: string, title: string) => {
    setBusyItem(key);
    try { toast.success((await createTask(title)) ? "Tarefa criada" : "Já existe uma tarefa pendente igual"); }
    catch { toast.error("Não foi possível criar a tarefa"); }
    finally { setBusyItem(null); }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Chamadas CloudTalk</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {calls.isLoading && <p className="text-xs text-muted-foreground">A carregar…</p>}
        {calls.isError && <p className="text-xs text-destructive">Não foi possível carregar as chamadas.</p>}
        {calls.data?.length === 0 && <p className="text-xs text-muted-foreground">Sem chamadas registadas.</p>}
        {calls.data?.map((c) => {
          const transcript = (Array.isArray(c.transcript) ? c.transcript : []) as Segment[];
          const items = (Array.isArray(c.action_items) ? c.action_items : []) as string[];
          const sent = c.sentiment ? SENTIMENT[c.sentiment] : null;
          return (
            <div key={c.id} className="space-y-2 border-b border-border pb-3 last:border-0">
              <div className="flex items-center gap-2 text-sm text-foreground">
                {c.direction === "inbound" ? <PhoneIncoming className="h-4 w-4 text-muted-foreground" aria-label="Recebida" /> : <PhoneOutgoing className="h-4 w-4 text-muted-foreground" aria-label="Efetuada" />}
                <span>{c.started_at ? new Date(c.started_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }) : "—"}</span>
                {sent && <Badge variant={sent.variant} className="text-[10px]">{sent.label}</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{fmtDur(c.duration_seconds)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{[c.status, c.agent_name].filter(Boolean).join(" · ")}</p>

              {c.summary ? (
                <div className="space-y-1">
                  <p className="text-sm text-foreground">{c.summary}</p>
                  <p className="text-[11px] text-muted-foreground">{c.ai_source === "cloudtalk" ? "Resumo CloudTalk" : "Resumo gerado por IA — confirme antes de agir"}</p>
                </div>
              ) : transcript.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {c.ai_status === "processing" ? <span>A gerar resumo…</span>
                    : c.ai_status === "failed" ? <span>Resumo indisponível{c.ai_error ? `: ${c.ai_error}` : ""}</span>
                    : <span>Sem resumo.</span>}
                  {manager && c.ai_status !== "processing" && (
                    <Button size="sm" variant="outline" className="h-7" disabled={generate.isPending}
                      onClick={() => generate.mutate(c.id, { onSuccess: () => toast.success("Resumo gerado"), onError: (e) => toast.error((e as Error).message) })}>
                      {generate.isPending && generate.variables === c.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                      Gerar resumo
                    </Button>
                  )}
                </div>
              ) : (
                c.duration_seconds ? <p className="text-xs text-muted-foreground">A aguardar transcrição.</p> : null
              )}

              {items.length > 0 && (
                <ul className="space-y-1" aria-label="Próximos passos">
                  {items.map((it, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="flex-1">• {it}</span>
                      {related.id && (
                        <Button size="sm" variant="ghost" className="h-6 px-2" disabled={busyItem === `${c.id}-${i}`}
                          onClick={() => onTask(`${c.id}-${i}`, it)} aria-label={`Criar tarefa: ${it}`}>
                          <ListPlus className="mr-1 h-3 w-3" />Criar tarefa
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {transcript.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild><Button variant="link" size="sm" className="h-auto p-0 text-xs">Ver transcrição</Button></CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-md bg-muted p-2">
                    {transcript.map((s, i) => (
                      <p key={i} className="text-xs text-foreground"><span className="font-medium">{SPEAKER[s.speaker] ?? SPEAKER.unknown}:</span> {s.text}</p>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {c.recording_url && /^https:\/\//.test(c.recording_url) && (
                <audio controls preload="none" src={c.recording_url} className="w-full h-8" aria-label="Gravação da chamada" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
