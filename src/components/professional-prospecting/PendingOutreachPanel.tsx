import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Send,
  Clock,
  Instagram,
  ChevronDown,
  ChevronUp,
  Copy,
  X,
  Play,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { resolveCadenceChannel } from "@/lib/prospecting/cadence";
import { checkProspectingIdentity, describeProspectingIdentity, isSeparateProspectingInstance, PROSPECTING_INSTANCE_NOT_READY_MESSAGE, SEPARATE_PROSPECTING_INSTANCE_MESSAGE } from "@/lib/prospecting/identity";
import { WhatsAppMessageDialog } from "@/components/whatsapp/WhatsAppMessageDialog";

interface OutreachItem {
  id: string;
  workspace_id: string;
  profile_id: string;
  step_index: number;
  status: string;
  scheduled_for: string;
  message: string | null;
  message_plain: string | null;
  tone: string | null;
  profile_name?: string;
  profile_url?: string;
  phone?: string | null;
  lead_id?: string | null;
}

type BulkPhase = "idle" | "generating" | "sending" | "done";

export function PendingOutreachPanel() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient, instanceData, isLoading: isInstanceLoading, error: instanceError } = useWorkspaceInstance();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [bulkPhase, setBulkPhase] = useState<BulkPhase>("idle");
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [bulkSent, setBulkSent] = useState<Set<string>>(new Set());
  const [bulkRejected, setBulkRejected] = useState<Set<string>>(new Set());
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [waItem, setWaItem] = useState<OutreachItem | null>(null);

  const isWhatsAppStep = (item: OutreachItem) =>
    !!item.lead_id && resolveCadenceChannel(item.step_index, item.phone) === "whatsapp";

  const canContinue = useCallback(async (item: OutreachItem): Promise<boolean> => {
    try {
      if (isInstanceLoading || instanceError) throw new Error(PROSPECTING_INSTANCE_NOT_READY_MESSAGE);
      if (isSeparateProspectingInstance(instanceData?.supabase_url, import.meta.env.VITE_SUPABASE_URL)) throw new Error(SEPARATE_PROSPECTING_INSTANCE_MESSAGE);
      const identity = await checkProspectingIdentity(workspaceClient, item.workspace_id, {
        name: item.profile_name || "Sem nome",
        phone: item.phone,
        profile_url: item.profile_url,
        instagram_url: item.profile_url?.includes("instagram.com") ? item.profile_url : null,
      }, item.profile_id);
      if (identity.status === "review") {
        return window.confirm(`${describeProspectingIdentity(identity)}\n\nConfirma que é outra entidade e pretende continuar?`);
      }
      if (identity.status !== "new") {
        toast.warning(describeProspectingIdentity(identity));
        return false;
      }
      return true;
    } catch (error) {
      toast.error("Não foi possível verificar este contacto", { description: error instanceof Error ? error.message : "Tente novamente" });
      return false;
    }
  }, [workspaceClient, instanceData?.supabase_url, isInstanceLoading, instanceError]);

  const { data: pendingItems = [], isLoading } = useQuery({
    queryKey: ["pending-outreach", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("prospecting_outreach_queue")
        .select("*, professional_prospecting_profiles(profile_name, profile_url, extracted_phone, converted_lead_id)")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "ready")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        profile_name: item.professional_prospecting_profiles?.profile_name,
        profile_url: item.professional_prospecting_profiles?.profile_url,
        phone: item.professional_prospecting_profiles?.extracted_phone ?? null,
        lead_id: item.professional_prospecting_profiles?.converted_lead_id ?? null,
      })) as OutreachItem[];
    },
    enabled: !!currentWorkspace?.id,
    refetchInterval: 60000,
  });

  const { data: scheduledCount = 0 } = useQuery({
    queryKey: ["scheduled-outreach-count", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return 0;
      const { count, error } = await supabase
        .from("prospecting_outreach_queue")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "scheduled");
      if (error) return 0;
      return count || 0;
    },
    enabled: !!currentWorkspace?.id,
  });

  // Generate message on-demand for items missing message
  const generateMessage = useCallback(async (item: OutreachItem) => {
    setGeneratingIds((prev) => new Set(prev).add(item.id));
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-prospecting-message",
        {
          body: {
            profile: {
              name: item.profile_name,
            },
            tone: item.tone || "casual",
            sequenceStep: item.step_index,
          },
        }
      );

      if (error) throw error;

      // Save generated message to queue
      const { error: saveError } = await supabase
        .from("prospecting_outreach_queue")
        .update({
          message: data.message,
          message_plain: data.message_plain,
        } as any)
        .eq("id", item.id);
      if (saveError) throw saveError;

      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      return data;
    } catch (err) {
      console.warn('[PROSPECTING] MSG_GENERATE_FAILED', err);
      toast.error("Erro ao gerar mensagem");
      return null;
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [queryClient]);

  // Mark as sent
  const markSent = useCallback(async (item: OutreachItem) => {
    const { error: profileError } = await supabase
      .from("professional_prospecting_profiles")
      .update({ outreach_step: item.step_index } as any)
      .eq("id", item.profile_id)
      .eq("workspace_id", item.workspace_id)
      .or(`outreach_step.is.null,outreach_step.lt.${item.step_index}`);
    if (profileError) throw profileError;
    const { data: updated, error: queueError } = await supabase
      .from("prospecting_outreach_queue")
      .update({ status: "sent" } as any)
      .eq("id", item.id)
      .eq("workspace_id", item.workspace_id)
      .eq("status", "ready")
      .select("id")
      .maybeSingle();
    if (queueError) throw queueError;
    if (!updated) throw new Error("Este follow-up já não está pronto para envio.");
    setBulkSent((prev) => new Set(prev).add(item.id));
    queryClient.invalidateQueries({ queryKey: ["prospecting-effectiveness", item.workspace_id] });
    console.log(`[PROSPECTING] Outreach sent: profile=${item.profile_id}, step=${item.step_index}`);
    if (currentWorkspace?.id) {
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'PROSPECT.OUTREACH_SENT',
        entity_kind: 'prospecting_profile',
        entity_id: item.profile_id,
        source_module: 'mkt-prospecting',
        payload: { profile_id: item.profile_id, step_index: item.step_index, channel: isWhatsAppStep(item) ? 'whatsapp' : 'instagram' },
      });
    }
  }, [currentWorkspace?.id, queryClient]);

  // Reject item
  const rejectMutation = useMutation({
    mutationFn: async (item: OutreachItem) => {
      const { error } = await supabase
        .from("prospecting_outreach_queue")
        .update({ status: "rejected" } as any)
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: (_, item) => {
      setBulkRejected((prev) => new Set(prev).add(item.id));
      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      toast.success("Follow-up rejeitado");
    },
    onError: () => toast.error("Não foi possível rejeitar o follow-up"),
  });

  // Abrir a DM não confirma a entrega; o utilizador confirma depois do envio.
  const handleSingleOpen = useCallback(async (item: OutreachItem) => {
    if (!await canContinue(item)) return;
    try {
    let msg = item.message;

    // Generate if missing
    if (!msg) {
      const result = await generateMessage(item);
      if (!result?.message) return;
      msg = result.message;
    }

    await navigator.clipboard.writeText(msg);

    // Open Instagram DM via ig.me link
    const username = item.profile_url?.match(/instagram\.com\/([^/?]+)/)?.[1];
    if (username) {
      window.open(`https://ig.me/m/${username}`, "_blank");
    } else if (item.profile_url) {
      window.open(item.profile_url, "_blank");
    }

    setOpenedIds((previous) => new Set(previous).add(item.id));
    toast.success("Mensagem copiada. Envie-a na DM e confirme aqui.");
    } catch (error) {
      toast.error("Não foi possível abrir a DM", { description: error instanceof Error ? error.message : "Tente novamente" });
    }
  }, [canContinue, generateMessage]);

  const handleSingleConfirm = useCallback(async (item: OutreachItem) => {
    if (!openedIds.has(item.id)) return;
    try {
      await markSent(item);
      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
      setOpenedIds((previous) => { const next = new Set(previous); next.delete(item.id); return next; });
      toast.success("Envio confirmado");
    } catch (error) {
      toast.error("Não foi possível registar o envio", { description: error instanceof Error ? error.message : "Tente novamente" });
    }
  }, [openedIds, markSent, queryClient]);

  // WhatsApp step: open the guarded WhatsApp dialog with the generated text
  const handleWhatsAppSend = useCallback(async (item: OutreachItem) => {
    if (!await canContinue(item)) return;
    let msg = item.message_plain || item.message;
    if (!msg) {
      const result = await generateMessage(item);
      if (!result?.message) return;
      msg = result.message_plain || result.message;
    }
    setWaItem({ ...item, message_plain: msg });
  }, [canContinue, generateMessage]);

  // Contact replied: stop the remaining cadence for this profile
  const stopCadenceMutation = useMutation({
    mutationFn: async (item: OutreachItem) => {
      const { error } = await supabase
        .from("prospecting_outreach_queue")
        .update({ status: "cancelled" } as any)
        .eq("profile_id", item.profile_id)
        .eq("workspace_id", item.workspace_id)
        .in("status", ["scheduled", "ready"]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-outreach-count"] });
      toast.success("Cadência parada para este contacto");
    },
    onError: () => toast.error("Não foi possível parar a cadência"),
  });

  // Bulk send flow (Instagram only; WhatsApp steps são enviados um a um)
  const activeItems = pendingItems.filter(
    (i) => !bulkSent.has(i.id) && !bulkRejected.has(i.id) && !isWhatsAppStep(i)
  );

  const startBulkSend = useCallback(async () => {
    setBulkPhase("generating");
    setBulkSent(new Set());
    setBulkRejected(new Set());
    setCurrentBulkIndex(0);

    // Generate messages for items that don't have one
    const needsGeneration = pendingItems.filter((i) => !i.message);
    if (needsGeneration.length > 0) {
      for (const item of needsGeneration) {
        await generateMessage(item);
      }
      // Refetch to get updated messages
      await queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
    }

    setBulkPhase("sending");
  }, [pendingItems, generateMessage, queryClient]);

  const handleBulkCopyAndOpen = useCallback(async (item: OutreachItem) => {
    if (!await canContinue(item)) return;
    try {
    if (item.message) {
      await navigator.clipboard.writeText(item.message);
    }
    const username = item.profile_url?.match(/instagram\.com\/([^/?]+)/)?.[1];
    if (username) {
      window.open(`https://ig.me/m/${username}`, "_blank");
    } else if (item.profile_url) {
      window.open(item.profile_url, "_blank");
    }
    setOpenedIds((previous) => new Set(previous).add(item.id));
    toast.success("Mensagem copiada. Envie-a na DM e confirme aqui.");
    } catch (error) {
      toast.error("Não foi possível abrir a DM", { description: error instanceof Error ? error.message : "Tente novamente" });
    }
  }, [canContinue]);

  const handleBulkConfirmSent = useCallback(async (item: OutreachItem) => {
    if (!openedIds.has(item.id)) return;
    try {
      await markSent(item);
      setCurrentBulkIndex((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
    } catch (error) {
      toast.error("Não foi possível registar o envio", { description: error instanceof Error ? error.message : "Tente novamente" });
    }
  }, [openedIds, markSent, queryClient]);

  const handleBulkReject = useCallback((item: OutreachItem) => {
    rejectMutation.mutate(item);
    setCurrentBulkIndex((prev) => prev + 1);
  }, [rejectMutation]);

  const finishBulk = useCallback(() => {
    setBulkPhase("idle");
    setCurrentBulkIndex(0);
    queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
    queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
  }, [queryClient]);

  if (pendingItems.length === 0 && scheduledCount === 0) return null;

  const totalBulk = pendingItems.length;
  const processedBulk = bulkSent.size + bulkRejected.size;
  const progressPct = totalBulk > 0 ? (processedBulk / totalBulk) * 100 : 0;

  // A fila guarda os passos 2 (dia 3) e 3 (dia 7)
  const stepLabel = (idx: number) => idx === 1 ? "Abertura" : idx === 2 ? "Follow-up" : "Fecho";
  const stepEmoji = (idx: number) => idx === 1 ? "👋" : idx === 2 ? "💡" : "🎯";

  return (
    <Card className="border-primary/20 bg-primary/5">
      {waItem?.lead_id && (
        <WhatsAppMessageDialog
          open={!!waItem}
          onOpenChange={(o) => { if (!o) setWaItem(null); }}
          phone={waItem.phone}
          entityType="lead"
          entityId={waItem.lead_id}
          entityName={waItem.profile_name}
          initialMessage={waItem.message_plain || waItem.message}
          onSent={async () => {
            await markSent(waItem);
            queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
          }}
        />
      )}
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => bulkPhase === "idle" && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">
              {pendingItems.length > 0
                ? `${pendingItems.length} follow-up${pendingItems.length > 1 ? "s" : ""} pronto${pendingItems.length > 1 ? "s" : ""} para enviar`
                : `${scheduledCount} follow-up${scheduledCount > 1 ? "s" : ""} agendado${scheduledCount > 1 ? "s" : ""}`}
            </p>
            {scheduledCount > 0 && pendingItems.length > 0 && (
              <p className="text-xs text-muted-foreground">
                + {scheduledCount} agendado{scheduledCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingItems.length > 1 && bulkPhase === "idle" && (
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                startBulkSend();
              }}
            >
              <Play className="w-3.5 h-3.5" />
              Enviar Todos ({pendingItems.length})
            </Button>
          )}
          {pendingItems.length > 0 && bulkPhase === "idle" && (
            <Badge variant="default" className="text-xs">
              {pendingItems.length} pendente{pendingItems.length > 1 ? "s" : ""}
            </Badge>
          )}
          {bulkPhase === "idle" &&
            (expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ))}
        </div>
      </div>

      {/* Bulk generating phase */}
      {bulkPhase === "generating" && (
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-background border">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">A gerar mensagens em falta...</p>
              <p className="text-xs text-muted-foreground">
                Isto pode demorar alguns segundos
              </p>
            </div>
          </div>
        </CardContent>
      )}

      {/* Bulk sending phase */}
      {bulkPhase === "sending" && (
        <CardContent className="pt-0 space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {processedBulk} de {totalBulk} processados
              </span>
              <span>
                {bulkSent.size} enviados · {bulkRejected.size} rejeitados
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>

          {/* Current item to process */}
          {activeItems.length > 0 ? (
            (() => {
              const current = activeItems[0];
              return (
                <div className="p-4 rounded-lg bg-background border space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-pink-500/10">
                      <Instagram className="w-4 h-4 text-pink-500" />
                    </div>
                    <span className="font-medium text-sm">
                      {current.profile_name || "Perfil"}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {stepEmoji(current.step_index)}{" "}
                      {stepLabel(current.step_index)}
                    </Badge>
                  </div>

                  {/* Message preview */}
                  {current.message ? (
                    <div className="bg-muted/50 rounded-md p-3 text-sm">
                      {current.message}
                    </div>
                  ) : generatingIds.has(current.id) ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A gerar mensagem...
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      Sem mensagem gerada
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5 flex-1"
                      onClick={() => handleBulkCopyAndOpen(current)}
                      disabled={!current.message || generatingIds.has(current.id)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar e Abrir DM
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleBulkConfirmSent(current)}
                      disabled={!openedIds.has(current.id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Já enviei
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => handleBulkReject(current)}
                    >
                      <X className="w-3.5 h-3.5" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              );
            })()
          ) : (
            /* All done */
            <div className="p-4 rounded-lg bg-background border text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
              <div>
                <p className="font-medium text-sm">Todos processados!</p>
                <p className="text-xs text-muted-foreground">
                  {bulkSent.size} enviado{bulkSent.size !== 1 ? "s" : ""} ·{" "}
                  {bulkRejected.size} rejeitado
                  {bulkRejected.size !== 1 ? "s" : ""}
                </p>
              </div>
              <Button size="sm" onClick={finishBulk}>
                Fechar
              </Button>
            </div>
          )}

          {/* Remaining queue */}
          {activeItems.length > 1 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">
                Próximos ({activeItems.length - 1}):
              </p>
              {activeItems.slice(1, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-xs text-muted-foreground py-1"
                >
                  <Instagram className="w-3 h-3 text-pink-400" />
                  <span className="truncate">
                    {item.profile_name || "Perfil"}
                  </span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {stepLabel(item.step_index)}
                  </Badge>
                </div>
              ))}
              {activeItems.length > 4 && (
                <p className="text-xs text-muted-foreground">
                  +{activeItems.length - 4} mais...
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}

      {/* Individual list (idle mode) */}
      {bulkPhase === "idle" && expanded && pendingItems.length > 0 && (
        <CardContent className="pt-0 space-y-3">
          {pendingItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 p-3 rounded-lg bg-background border"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-muted mt-0.5">
                  {isWhatsAppStep(item) ? (
                    <MessageCircle className="w-3.5 h-3.5 text-primary" aria-label="WhatsApp" />
                  ) : (
                    <Instagram className="w-3.5 h-3.5 text-pink-500" aria-label="Instagram" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {item.profile_name || "Perfil"}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {stepEmoji(item.step_index)} {stepLabel(item.step_index)}
                    </Badge>
                  </div>
                  {item.message ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Mensagem será gerada ao enviar
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isWhatsAppStep(item)) handleWhatsAppSend(item);
                      else handleSingleOpen(item);
                    }}
                    disabled={generatingIds.has(item.id)}
                    className="gap-1"
                  >
                    {generatingIds.has(item.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isWhatsAppStep(item) ? "WhatsApp" : "Abrir DM"}
                  </Button>
                  {!isWhatsAppStep(item) && openedIds.has(item.id) && (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSingleConfirm(item); }}>
                      Já enviei
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      stopCadenceMutation.mutate(item);
                    }}
                    disabled={stopCadenceMutation.isPending}
                    title="Parar os próximos follow-ups"
                  >
                    Parar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      rejectMutation.mutate(item);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
