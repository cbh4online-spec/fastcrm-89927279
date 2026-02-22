import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy, Check, Loader2, Send, ExternalLink, Instagram,
  CheckCircle, AlertCircle, SkipForward, PartyPopper, RotateCcw, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const extractInstagramUsername = (url: string): string | null => {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
};

interface BulkProfile {
  id: string;
  profile_name: string | null;
  profile_url: string;
  inferred_profession: string | null;
  platform: string;
}

interface GeneratedMessage {
  profileId: string;
  message: string;
  message_plain: string;
  error?: string;
}

interface BulkOutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: BulkProfile[];
  generatedMessages: GeneratedMessage[];
  isGenerating: boolean;
  generationProgress: { done: number; total: number };
  onComplete: () => void;
  userId?: string;
  workspaceId?: string;
}

// Profile states: idle -> opened (Instagram opened) -> sent (confirmed) -> rejected
type ProfileState = "idle" | "opened" | "sent" | "rejected";

export function BulkOutreachDialog({
  open,
  onOpenChange,
  profiles,
  generatedMessages,
  isGenerating,
  generationProgress,
  onComplete,
  userId,
  workspaceId,
}: BulkOutreachDialogProps) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const activeProfileRef = useRef<HTMLDivElement>(null);

  const totalProfiles = profiles.length;
  const rejectedCount = rejectedIds.size;
  const sentCount = sentIds.size;
  const effectiveTotal = totalProfiles - rejectedCount;
  const allDone = effectiveTotal > 0 && sentCount >= effectiveTotal;

  const progressPercent = isGenerating
    ? (generationProgress.done / generationProgress.total) * 100
    : effectiveTotal > 0 ? ((sentCount + rejectedCount) / totalProfiles) * 100 : 0;

  // Find the next unsent/unrejected profile
  const nextProfile = profiles.find(p => !sentIds.has(p.id) && !rejectedIds.has(p.id) && getMessageForProfile(p.id)?.message);

  // Auto-scroll to next profile
  useEffect(() => {
    if (!isGenerating && activeProfileRef.current) {
      activeProfileRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [sentCount, isGenerating]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setOpenedIds(new Set());
      setRejectedIds(new Set());
    }
  }, [open]);

  function getMessageForProfile(profileId: string) {
    return generatedMessages.find(m => m.profileId === profileId);
  }

  function getProfileState(profileId: string): ProfileState {
    if (sentIds.has(profileId)) return "sent";
    if (rejectedIds.has(profileId)) return "rejected";
    if (openedIds.has(profileId)) return "opened";
    return "idle";
  }

  const handleReject = async (profile: BulkProfile) => {
    setRejectedIds(prev => new Set(prev).add(profile.id));

    try {
      await supabase
        .from("professional_prospecting_profiles")
        .update({
          status: "rejected",
          rejection_reason: "Rejeitado no outreach em massa",
        } as any)
        .eq("id", profile.id);

      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
    } catch (err) {
      console.error("Erro ao rejeitar perfil:", err);
    }

    toast.success(`${profile.profile_name || "Perfil"} rejeitado`);
  };

  const handleCopyAndOpen = async (profile: BulkProfile) => {
    const msg = getMessageForProfile(profile.id);
    if (!msg || !msg.message) return;

    try {
      await navigator.clipboard.writeText(msg.message_plain || msg.message);
      setCopiedId(profile.id);
      setTimeout(() => setCopiedId(null), 2000);

      const username = extractInstagramUsername(profile.profile_url);
      const dmUrl = username ? `https://ig.me/m/${username}` : profile.profile_url;
      window.open(dmUrl, "_blank");
      toast.success("Mensagem copiada! Cole (Ctrl+V) na conversa e envie");

      // Only mark as opened, NOT as sent
      setOpenedIds(prev => new Set(prev).add(profile.id));
    } catch {
      toast.error("Erro ao copiar mensagem");
    }
  };

  const handleConfirmSent = async (profile: BulkProfile) => {
    // Mark as sent
    setSentIds(prev => new Set(prev).add(profile.id));

    await supabase
      .from("professional_prospecting_profiles")
      .update({ outreach_step: 1 } as any)
      .eq("id", profile.id);

    const wsId = workspaceId || currentWorkspace?.id;

    if (wsId) {
      const now = new Date();
      const day3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await supabase.from("prospecting_outreach_queue").insert([
        {
          workspace_id: wsId,
          profile_id: profile.id,
          step_index: 2,
          scheduled_for: day3.toISOString(),
          status: "scheduled",
        },
        {
          workspace_id: wsId,
          profile_id: profile.id,
          step_index: 3,
          scheduled_for: day7.toISOString(),
          status: "scheduled",
        },
      ] as any);

      // Auto-create lead and convert profile
      try {
        const msg = getMessageForProfile(profile.id);
        const leadData: Record<string, unknown> = {
          workspace_id: wsId,
          name: profile.profile_name || "Sem nome",
          source: "professional_prospecting",
          status: "new",
          website: profile.profile_url,
          instagram_url: profile.platform === "instagram" ? profile.profile_url : null,
          prospecting_profile_id: profile.id,
        };

        if (userId) {
          leadData.created_by = userId;
          leadData.assigned_to = userId;
        }

        if (profile.inferred_profession) {
          leadData.inferred_profession = profile.inferred_profession;
          leadData.business_category = profile.inferred_profession;
        }

        if (msg?.message_plain || msg?.message) {
          leadData.notes = `📨 Mensagem de outreach enviada:\n"${msg.message_plain || msg.message}"`;
        }

        const { data: newLead } = await supabase
          .from("leads")
          .insert([leadData as any])
          .select("id")
          .single();

        // Update prospecting profile to "converted" so it leaves the list
        if (newLead?.id) {
          await supabase
            .from("professional_prospecting_profiles")
            .update({
              status: "converted",
              converted_lead_id: newLead.id,
              converted_at: new Date().toISOString(),
              converted_by: userId || null,
            } as any)
            .eq("id", profile.id);
        }

        // Invalidate queries so the list updates immediately
        queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
      } catch (err) {
        console.error("Erro ao criar lead automaticamente:", err);
      }
    }

    toast.success(`${profile.profile_name || "Perfil"} marcado como enviado`);
  };

  const handleReopenDM = async (profile: BulkProfile) => {
    const msg = getMessageForProfile(profile.id);
    if (msg?.message) {
      await navigator.clipboard.writeText(msg.message_plain || msg.message);
    }
    const username = extractInstagramUsername(profile.profile_url);
    const dmUrl = username ? `https://ig.me/m/${username}` : profile.profile_url;
    window.open(dmUrl, "_blank");
    toast.success("Mensagem copiada novamente!");
  };

  const handleNextProfile = () => {
    if (nextProfile) {
      handleCopyAndOpen(nextProfile);
    } else {
      toast.info("Todos os perfis foram processados!");
    }
  };

  const handleClose = () => {
    if (sentCount > 0 || rejectedCount > 0) {
      onComplete();
    }
    setSentIds(new Set());
    setOpenedIds(new Set());
    setRejectedIds(new Set());
    onOpenChange(false);
  };

  const handleTryClose = () => {
    if (isGenerating) return;
    if ((sentCount > 0 || rejectedCount > 0) && sentCount < effectiveTotal) {
      setShowCloseConfirm(true);
      return;
    }
    if (!isGenerating && generatedMessages.length > 0 && sentCount === 0 && rejectedCount === 0 && !allDone) {
      setShowCloseConfirm(true);
      return;
    }
    handleClose();
  };

  const phase: "generating" | "sending" | "completed" = isGenerating
    ? "generating"
    : allDone
      ? "completed"
      : "sending";

  // Persistent fixed panel instead of Radix Dialog
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/80 animate-in fade-in-0" />

        {/* Panel */}
        <div className="relative z-10 bg-background border rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] flex flex-col p-6 mx-4 animate-in fade-in-0 zoom-in-95">
          {/* Close button */}
          {phase !== "generating" && (
            <button
              onClick={handleTryClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}

          {/* Header */}
          <div className="flex flex-col space-y-1.5 text-left mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {phase === "generating" && "A preparar mensagens..."}
                {phase === "sending" && "Outreach em Massa"}
                {phase === "completed" && "Outreach Concluído! 🎉"}
              </h2>
              <Badge variant="secondary">{totalProfiles} perfis</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {phase === "generating" &&
                `A gerar mensagens personalizadas... ${generationProgress.done} de ${generationProgress.total}`
              }
              {phase === "sending" &&
                `${sentCount} de ${effectiveTotal} enviados${rejectedCount > 0 ? `, ${rejectedCount} rejeitado${rejectedCount > 1 ? 's' : ''}` : ''} — Clique no botão abaixo para copiar e abrir o Instagram`
              }
              {phase === "completed" &&
                `Todos os ${effectiveTotal} perfis foram contactados com sucesso!${rejectedCount > 0 ? ` (${rejectedCount} rejeitado${rejectedCount > 1 ? 's' : ''})` : ''}`
              }
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {phase === "generating"
                ? `${generationProgress.done}/${generationProgress.total} gerados`
                : `${sentCount}/${effectiveTotal} enviados${rejectedCount > 0 ? ` · ${rejectedCount} rejeitado${rejectedCount > 1 ? 's' : ''}` : ''}`
              }
            </p>
          </div>

          {/* Phase: Generating */}
          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                A preparar mensagens... {generationProgress.done} de {generationProgress.total}
              </p>
              <p className="text-xs text-muted-foreground">
                Não feche esta janela
              </p>
            </div>
          )}

          {/* Phase: Sending */}
          {phase === "sending" && (
            <>
              {/* Instruction banner */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm mt-4">
                <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0" />
                <span>
                  Clique <strong>"Abrir DM"</strong> para copiar a mensagem e abrir o Instagram. 
                  Depois volte aqui e clique <strong>"Já enviei"</strong> para avançar.
                </span>
              </div>

              {/* Profiles List */}
              <ScrollArea className="flex-1 min-h-0 max-h-[40vh] mt-4">
                <div className="space-y-2 pr-4">
                  {profiles.map(profile => {
                    const msg = getMessageForProfile(profile.id);
                    const profileState = getProfileState(profile.id);
                    const hasError = msg?.error;
                    const hasMessage = msg?.message;
                    const isNext = nextProfile?.id === profile.id;

                    return (
                      <div
                        key={profile.id}
                        ref={isNext ? activeProfileRef : undefined}
                        className={cn(
                          "border rounded-lg p-3 transition-all",
                          profileState === "sent" && "bg-muted/50 border-green-500/30 opacity-60",
                          profileState === "rejected" && "bg-muted/30 border-destructive/20 opacity-50",
                          profileState === "opened" && "ring-2 ring-amber-500 border-amber-500/50 bg-amber-500/5",
                          hasError && "border-destructive/30",
                          isNext && profileState === "idle" && "ring-2 ring-primary border-primary/50 bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status Icon */}
                          <div className="mt-0.5">
                            {profileState === "sent" ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : profileState === "rejected" ? (
                              <X className="w-5 h-5 text-destructive" />
                            ) : profileState === "opened" ? (
                              <AlertCircle className="w-5 h-5 text-amber-500" />
                            ) : hasError ? (
                              <AlertCircle className="w-5 h-5 text-destructive" />
                            ) : !hasMessage && isGenerating ? (
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                              <Instagram className="w-5 h-5 text-pink-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate max-w-[60%]">
                                {profile.profile_name || "Sem nome"}
                              </span>
                              {profileState === "opened" && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-500/30">
                                  A aguardar confirmação
                                </Badge>
                              )}
                              {profileState === "rejected" && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Rejeitado
                                </Badge>
                              )}
                              {isNext && profileState === "idle" && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  Próximo
                                </Badge>
                              )}
                              {profile.inferred_profession && (
                                <span className="text-xs text-muted-foreground truncate">
                                  - {profile.inferred_profession}
                                </span>
                              )}
                            </div>

                            {hasMessage && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words overflow-hidden">
                                "{msg.message_plain || msg.message}"
                              </p>
                            )}

                            {hasError && (
                              <p className="text-xs text-destructive mt-1">
                                Erro: {msg.error}
                              </p>
                            )}
                          </div>

                          {/* Action */}
                          <div className="flex-shrink-0">
                            {profileState === "sent" ? (
                              <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs">
                                Enviado ✓
                              </Badge>
                            ) : profileState === "rejected" ? (
                              <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                                Rejeitado ✗
                              </Badge>
                            ) : profileState === "opened" ? (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="gap-1 text-xs"
                                  onClick={() => handleConfirmSent(profile)}
                                >
                                  <Check className="w-3 h-3" />
                                  Já enviei
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-xs"
                                  onClick={() => handleReopenDM(profile)}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Abrir novamente
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-xs text-destructive hover:text-destructive"
                                  onClick={() => handleReject(profile)}
                                >
                                  <X className="w-3 h-3" />
                                  Rejeitar
                                </Button>
                              </div>
                            ) : hasMessage ? (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant={isNext ? "default" : "outline"}
                                  className="gap-1 text-xs"
                                  onClick={() => handleCopyAndOpen(profile)}
                                >
                                  {copiedId === profile.id ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  Abrir DM
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleReject(profile)}
                                >
                                  <X className="w-3 h-3" />
                                  Rejeitar
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Phase: Completed */}
          {phase === "completed" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{sentCount}/{effectiveTotal} enviados!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Todos os perfis foram contactados. Os follow-ups foram agendados automaticamente.
                  {rejectedCount > 0 && ` (${rejectedCount} perfil${rejectedCount > 1 ? 's' : ''} rejeitado${rejectedCount > 1 ? 's' : ''})`}
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t mt-4">
            {phase === "completed" ? (
              <div className="w-full flex justify-center">
                <Button onClick={handleClose} size="lg" className="gap-2 px-8">
                  <CheckCircle className="w-4 h-4" />
                  Concluir
                </Button>
              </div>
            ) : phase === "generating" ? (
              <p className="text-xs text-muted-foreground w-full text-center">
                Aguarde enquanto as mensagens são geradas...
              </p>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleTryClose}>
                  Fechar
                </Button>
                <div className="flex items-center gap-2">
                  {nextProfile && (
                    <Button onClick={handleNextProfile} size="lg" className="gap-2">
                      <Send className="w-4 h-4" />
                      Abrir DM de {nextProfile.profile_name || "próximo perfil"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Close confirmation dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Ainda tem {effectiveTotal - sentCount} perfil(is) por enviar. 
              Se fechar agora, perderá o progresso das mensagens geradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar a enviar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>
              Fechar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
