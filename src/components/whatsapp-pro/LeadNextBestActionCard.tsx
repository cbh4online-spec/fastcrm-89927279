/**
 * Painel "Próxima Melhor Ação" (Next Best Message) na ficha da lead.
 *
 * Mostra a ação recomendada pelo motor determinístico, a mensagem
 * sugerida já com as variáveis resolvidas e as ações comerciais:
 * Enviar, Editar, Ver alternativas e Ignorar.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Send, Pencil, Layers, X, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLeadNextBestAction, useResolveLeadNBA } from "@/hooks/useLeadNextBestAction";
import { useRecommendNextBestActions } from "@/hooks/useWhatsAppPlaybook";
import { useSendWhatsAppMessage } from "@/hooks/useWhatsAppMessage";
import { NEXT_BEST_ACTION_LABELS, type NextBestActionKind } from "@/lib/whatsapp/engine/families";
import { renderEngineMessage } from "@/lib/whatsapp/engine/render";

const URGENCY_TONE: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-amber-500/15 text-amber-600",
  medium: "bg-primary/10 text-primary",
  low: "bg-muted text-muted-foreground",
};

interface Props {
  leadId: string;
}

export function LeadNextBestActionCard({ leadId }: Props) {
  const { data, rendered, isLoading } = useLeadNextBestAction(leadId);
  const recommend = useRecommendNextBestActions();
  const resolveNBA = useResolveLeadNBA();
  const send = useSendWhatsAppMessage();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [altCode, setAltCode] = useState<string>("");

  const action = data?.action ?? null;
  const template = data?.template ?? null;
  const phone = data?.lead?.phone ?? null;

  const alternative = (data?.alternatives ?? []).find((t) => t.code === altCode) ?? null;
  const activeBody = alternative?.message_body ?? template?.message_body ?? "";
  const activeRender = alternative
    ? renderEngineMessage({
        body: alternative.message_body,
        values: {},
        fallbacks: alternative.variable_fallbacks ?? {},
        requiredVariables: alternative.required_variables ?? [],
      })
    : rendered;

  useEffect(() => {
    setDraft(activeRender?.text ?? activeBody);
  }, [activeRender?.text, activeBody]);

  const missing = activeRender?.missing ?? [];
  const blocked = !phone || draft.trim().length === 0;

  const handleSend = async () => {
    if (!phone) {
      toast.error("Lead sem telefone válido.");
      return;
    }
    if (/\{\{\s*[\w.-]+\s*\}\}/.test(draft)) {
      toast.error("A mensagem ainda tem variáveis por resolver.");
      return;
    }
    await send.mutateAsync({
      channel: "pro",
      phone,
      message: draft.trim(),
      entityType: "lead",
      entityId: leadId,
      entityName: data?.lead?.name ?? null,
      templateName: (alternative?.code ?? template?.code) ?? null,
    });
    if (action) await resolveNBA.mutateAsync({ actionId: action.id, outcome: "acted" });
    setEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Próxima Melhor Ação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Próxima Melhor Ação
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => recommend.mutate({ leadIds: [leadId], limit: 1 })}
          disabled={recommend.isPending}
          aria-label="Recalcular próxima ação"
        >
          <RefreshCw className={`h-4 w-4 ${recommend.isPending ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {!action ? (
          <div className="text-sm text-muted-foreground">
            Sem recomendação ativa para esta lead. Use o botão de recálculo para pedir uma nova
            análise ao motor comercial.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {NEXT_BEST_ACTION_LABELS[action.action_type as NextBestActionKind] ?? action.action_type}
              </Badge>
              <Badge className={URGENCY_TONE[action.urgency] ?? URGENCY_TONE.low} variant="outline">
                Urgência: {action.urgency}
              </Badge>
              <Badge variant="outline">Prioridade {action.priority_score}</Badge>
              {template && <Badge variant="outline">{template.code}</Badge>}
            </div>

            {template?.objective && (
              <p className="text-sm">
                <span className="text-muted-foreground">Objetivo: </span>
                {template.objective}
              </p>
            )}
            {action.rationale && (
              <p className="text-sm text-muted-foreground">{action.rationale}</p>
            )}
            {action.due_at && (
              <p className="text-xs text-muted-foreground">
                Timing: a partir de {new Date(action.due_at).toLocaleString("pt-PT")}
              </p>
            )}

            {!template ? (
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                Esta ação não tem template associado — requer intervenção manual do comercial.
              </div>
            ) : (
              <>
                {missing.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
                    <span>
                      Variáveis sem valor: {missing.join(", ")}. Reveja a mensagem antes de enviar.
                    </span>
                  </div>
                )}

                {editing ? (
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={7}
                    aria-label="Mensagem sugerida"
                  />
                ) : (
                  <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                    {draft || "—"}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={handleSend} disabled={blocked || send.isPending}>
                    <Send className="h-4 w-4 mr-1" />
                    {send.isPending ? "A enviar..." : "Enviar"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing((v) => !v)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    {editing ? "Pré-visualizar" : "Editar"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => resolveNBA.mutate({ actionId: action.id, outcome: "dismissed" })}
                    disabled={resolveNBA.isPending}
                  >
                    <X className="h-4 w-4 mr-1" /> Ignorar
                  </Button>
                </div>

                {(data?.alternatives.length ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <Select value={altCode} onValueChange={setAltCode}>
                      <SelectTrigger className="h-9 w-[280px]">
                        <SelectValue placeholder="Ver alternativas" />
                      </SelectTrigger>
                      <SelectContent>
                        {data!.alternatives.map((t) => (
                          <SelectItem key={t.code} value={t.code}>
                            {t.code} — {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {altCode && (
                      <Button variant="ghost" size="sm" onClick={() => setAltCode("")}>
                        Repor sugestão
                      </Button>
                    )}
                  </div>
                )}

                {!phone && (
                  <p className="text-xs text-destructive">
                    Lead sem telefone — o envio por WhatsApp está bloqueado.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
