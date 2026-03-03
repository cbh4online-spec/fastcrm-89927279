import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
} from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

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
}

type BulkPhase = "idle" | "generating" | "sending" | "done";

export function PendingOutreachPanel() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [bulkPhase, setBulkPhase] = useState<BulkPhase>("idle");
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);
  const [bulkSent, setBulkSent] = useState<Set<string>>(new Set());
  const [bulkRejected, setBulkRejected] = useState<Set<string>>(new Set());
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  const { data: pendingItems = [], isLoading } = useQuery({
    queryKey: ["pending-outreach", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("prospecting_outreach_queue")
        .select("*, professional_prospecting_profiles(profile_name, profile_url)")
        .eq("workspace_id", currentWorkspace.id)
        .eq("status", "ready")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        profile_name: item.professional_prospecting_profiles?.profile_name,
        profile_url: item.professional_prospecting_profiles?.profile_url,
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
            sequenceStep: item.step_index + 1,
          },
        }
      );

      if (error) throw error;

      // Save generated message to queue
      await supabase
        .from("prospecting_outreach_queue")
        .update({
          message: data.message,
          message_plain: data.message_plain,
        } as any)
        .eq("id", item.id);

      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      return data;
    } catch (err) {
      console.error("Error generating message:", err);
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
    await supabase
      .from("prospecting_outreach_queue")
      .update({ status: "sent" } as any)
      .eq("id", item.id);
    await supabase
      .from("professional_prospecting_profiles")
      .update({ outreach_step: item.step_index + 1 } as any)
      .eq("id", item.profile_id);
    setBulkSent((prev) => new Set(prev).add(item.id));
  }, []);

  // Reject item
  const rejectMutation = useMutation({
    mutationFn: async (item: OutreachItem) => {
      await supabase
        .from("prospecting_outreach_queue")
        .update({ status: "rejected" } as any)
        .eq("id", item.id);
    },
    onSuccess: (_, item) => {
      setBulkRejected((prev) => new Set(prev).add(item.id));
      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      toast.success("Follow-up rejeitado");
    },
  });

  // Single send: copy + open DM
  const handleSingleSend = useCallback(async (item: OutreachItem) => {
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

    await markSent(item);
    queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
    queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
    toast.success("Mensagem copiada! DM aberta.");
  }, [generateMessage, markSent, queryClient]);

  // Bulk send flow
  const activeItems = pendingItems.filter(
    (i) => !bulkSent.has(i.id) && !bulkRejected.has(i.id)
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
    if (item.message) {
      await navigator.clipboard.writeText(item.message);
    }
    const username = item.profile_url?.match(/instagram\.com\/([^/?]+)/)?.[1];
    if (username) {
      window.open(`https://ig.me/m/${username}`, "_blank");
    } else if (item.profile_url) {
      window.open(item.profile_url, "_blank");
    }
    toast.success("Mensagem copiada! DM aberta.");
  }, []);

  const handleBulkConfirmSent = useCallback(async (item: OutreachItem) => {
    await markSent(item);
    setCurrentBulkIndex((prev) => prev + 1);
    queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
    queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
  }, [markSent, queryClient]);

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

  const stepLabel = (idx: number) => (idx === 1 ? "Follow-up" : "Fecho");
  const stepEmoji = (idx: number) => (idx === 1 ? "💡" : "🎯");

  return (
    <Card className="border-primary/20 bg-primary/5">
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
                      disabled={!current.message && !generatingIds.has(current.id)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar e Abrir DM
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => handleBulkConfirmSent(current)}
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
                <div className="p-1.5 rounded-full bg-pink-500/10 mt-0.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-500" />
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
                      handleSingleSend(item);
                    }}
                    disabled={generatingIds.has(item.id)}
                    className="gap-1"
                  >
                    {generatingIds.has(item.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Enviar
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
