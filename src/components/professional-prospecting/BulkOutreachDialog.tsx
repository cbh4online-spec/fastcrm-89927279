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
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  Copy, Check, Loader2, Send, ExternalLink, Instagram,
  CheckCircle, AlertCircle, SkipForward, PartyPopper, RotateCcw, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { PowerHourFocusView } from "./PowerHourFocusView";
import { useOutreachMedia } from "@/hooks/useOutreachMedia";
import { OutreachMediaPicker } from "@/components/prospecting/OutreachMediaPicker";
import { composeMessageWithLink } from "@/lib/prospecting/outreachMedia";
import { buildFollowUpRows, buildInitialOutreachRow } from "@/lib/prospecting/cadence";
import { checkProspectingIdentity, describeProspectingIdentity, isSeparateProspectingInstance, PROSPECTING_INSTANCE_NOT_READY_MESSAGE, SEPARATE_PROSPECTING_INSTANCE_MESSAGE } from "@/lib/prospecting/identity";

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
  phone?: string | null;
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

// Profile states: idle -> opened (perfil aberto) -> sent (confirmado) -> rejected
type ProfileState = "idle" | "opened" | "sent" | "rejected";

export function BulkOutreachDialog({
  open,
  onOpenChange,
  profiles,
  generatedMessages,
  isGenerating,
  generationProgress,
  onComplete,
  workspaceId,
}: BulkOutreachDialogProps) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient, instanceData, isLoading: isInstanceLoading, error: instanceError } = useWorkspaceInstance();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [reviewProfile, setReviewProfile] = useState<{ profile: BulkProfile; reason: string } | null>(null);
  const activeProfileRef = useRef<HTMLDivElement>(null);
  const [focusMode, setFocusMode] = useState(true);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [sessionStartedAt, setSessionStartedAt] = useState(() => Date.now());
  // Conteúdo guardado por perfil/etapa 1; o «comum» grava a mesma ligação em cada perfil.
  const media = useOutreachMedia(profiles.map((p) => p.id));
  const mediaBusy = media.setUrl.isPending || media.uploadVideo.isPending || media.remove.isPending;
  const [openedSnapshots, setOpenedSnapshots] = useState<Record<string, { text: string; url: string | null }>>({});

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

  // Modo foco: perfis pulados vão para o fim da fila
  const pendingProfiles = profiles.filter(p => !sentIds.has(p.id) && !rejectedIds.has(p.id) && getMessageForProfile(p.id)?.message);
  const focusProfile = pendingProfiles.find(p => !skippedIds.has(p.id)) ?? pendingProfiles[0] ?? null;

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
      setSkippedIds(new Set());
      setEditedMessages({});
      setOpenedSnapshots({});
    } else {
      setSessionStartedAt(Date.now());
    }
  }, [open]);

  function getMessageForProfile(profileId: string) {
    const base = generatedMessages.find(m => m.profileId === profileId);
    const edited = editedMessages[profileId];
    if (!base || edited === undefined) return base;
    return { ...base, message: edited, message_plain: edited };
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
      console.warn('[PROSPECTING] BULK_REJECT_FAILED', err);
    }

    toast.success(`${profile.profile_name || "Perfil"} rejeitado`);
  };

  const copyAndOpen = async (profile: BulkProfile) => {
    const msg = getMessageForProfile(profile.id);
    if (!msg || !msg.message) return;
    try {
      if (isInstanceLoading || instanceError) throw new Error(PROSPECTING_INSTANCE_NOT_READY_MESSAGE);
      if (isSeparateProspectingInstance(instanceData?.supabase_url, import.meta.env.VITE_SUPABASE_URL)) throw new Error(SEPARATE_PROSPECTING_INSTANCE_MESSAGE);
      const url = media.get(profile.id, 1)?.url ?? null;
      const text = composeMessageWithLink(msg.message_plain || msg.message, url);
      await navigator.clipboard.writeText(text);
      setOpenedSnapshots((prev) => ({ ...prev, [profile.id]: { text, url } }));
      setCopiedId(profile.id);
      setTimeout(() => setCopiedId(null), 2000);

      const username = extractInstagramUsername(profile.profile_url);
      const dmUrl = username ? `https://ig.me/m/${username}` : profile.profile_url;
      window.open(dmUrl, "_blank");
      toast.success("Mensagem copiada! Cole (Ctrl+V) na conversa e envie");

      // Only mark as opened, NOT as sent
      setOpenedIds(prev => new Set(prev).add(profile.id));
    } catch (error) {
      toast.error("Não foi possível abrir a abordagem", { description: error instanceof Error ? error.message : "Tente novamente" });
    }
  };

  const handleCopyAndOpen = async (profile: BulkProfile) => {
    try {
      const wsId = workspaceId || currentWorkspace?.id;
      if (!wsId) throw new Error("Espaço de trabalho indisponível");
      if (isInstanceLoading || instanceError) throw new Error(PROSPECTING_INSTANCE_NOT_READY_MESSAGE);
      if (isSeparateProspectingInstance(instanceData?.supabase_url, import.meta.env.VITE_SUPABASE_URL)) throw new Error(SEPARATE_PROSPECTING_INSTANCE_MESSAGE);
      const identity = await checkProspectingIdentity(workspaceClient, wsId, {
        name: profile.profile_name || "Sem nome",
        phone: profile.phone,
        profile_url: profile.profile_url,
        instagram_url: profile.platform === "instagram" ? profile.profile_url : null,
      }, profile.id);
      if (identity.status === "review") {
        setReviewProfile({ profile, reason: describeProspectingIdentity(identity) });
        return;
      }
      if (identity.status !== "new") {
        toast.warning(describeProspectingIdentity(identity));
        return;
      }
      await copyAndOpen(profile);
    } catch (error) {
      toast.error("Não foi possível verificar este contacto", { description: error instanceof Error ? error.message : "Tente novamente" });
    }
  };

  const handleConfirmSent = async (profile: BulkProfile) => {
    const wsId = workspaceId || currentWorkspace?.id;
    const snapshot = openedSnapshots[profile.id];
    if (!wsId || !openedIds.has(profile.id) || !snapshot || confirmingIds.has(profile.id)) return;
    const sentFields = { sent_message: snapshot.text, sent_media_url: snapshot.url, sent_at: new Date().toISOString() };
    setConfirmingIds(prev => new Set(prev).add(profile.id));
    try {
      if (isInstanceLoading || instanceError) throw new Error(PROSPECTING_INSTANCE_NOT_READY_MESSAGE);
      if (isSeparateProspectingInstance(instanceData?.supabase_url, import.meta.env.VITE_SUPABASE_URL)) throw new Error(SEPARATE_PROSPECTING_INSTANCE_MESSAGE);
      const now = new Date();
      const { data: existing, error: readError } = await supabase
        .from("prospecting_outreach_queue")
        .select("id, step_index, status")
        .eq("workspace_id", wsId)
        .eq("profile_id", profile.id)
        .in("step_index", [1, 2, 3]);
      if (readError) throw readError;
      const rows = existing ?? [];
      const initial = rows.find((row) => row.step_index === 1);
      const msg = getMessageForProfile(profile.id);
      if (initial) {
        if (initial.status !== "sent") {
          const { error } = await supabase.from("prospecting_outreach_queue")
            .update({ status: "sent", message: msg?.message || null, message_plain: msg?.message_plain || msg?.message || null, ...sentFields })
            .eq("id", initial.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("prospecting_outreach_queue")
          .insert({ ...buildInitialOutreachRow({ workspaceId: wsId, profileId: profile.id, now }), message: msg?.message || null, message_plain: msg?.message_plain || msg?.message || null, ...sentFields });
        if (error) throw error;
      }
      const followUps = buildFollowUpRows({ workspaceId: wsId, profileId: profile.id, now })
        .filter((followUp) => !rows.some((row) => row.step_index === followUp.step_index));
      if (followUps.length) {
        const { error } = await supabase.from("prospecting_outreach_queue").insert(followUps);
        if (error) throw error;
      }
      const { error: profileError } = await supabase.from("professional_prospecting_profiles")
        .update({ outreach_step: 1 }).eq("id", profile.id).eq("workspace_id", wsId)
        .or("outreach_step.is.null,outreach_step.lt.1");
      if (profileError) throw profileError;
      setSentIds(prev => new Set(prev).add(profile.id));

      queryClient.invalidateQueries({ queryKey: ["prospecting-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["prospecting-effectiveness"] });
      queryClient.invalidateQueries({ queryKey: ["pending-outreach"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-outreach-count"] });
      console.log(`[PROSPECTING] Bulk outreach sent: profile=${profile.id}`);
      emitKernelEvent({
        workspace_id: wsId,
        type: 'PROSPECT.OUTREACH_SENT',
        entity_kind: 'prospecting_profile',
        entity_id: profile.id,
        source_module: 'mkt-prospecting',
        payload: { profile_id: profile.id, step_index: 1, channel: 'instagram', bulk: true },
      });
      toast.success(`${profile.profile_name || "Perfil"} marcado como enviado`);
    } catch (error) {
      toast.error("Não foi possível registar o envio", { description: error instanceof Error ? error.message : "Tente novamente" });
    } finally {
      setConfirmingIds(prev => { const next = new Set(prev); next.delete(profile.id); return next; });
    }
  };

  const handleReopenDM = async (profile: BulkProfile) => {
    await handleCopyAndOpen(profile);
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
                {phase === "sending" && "Abordagem em lote"}
                {phase === "completed" && "Outreach Concluído! 🎉"}
              </h2>
              <div className="flex items-center gap-2 mr-6">
                {phase === "sending" && (
                  <Button
                    size="sm"
                    variant={focusMode ? "default" : "outline"}
                    onClick={() => setFocusMode(v => !v)}
                    aria-pressed={focusMode}
                  >
                    {focusMode ? "Ver lista" : "Modo foco"}
                  </Button>
                )}
                <Badge variant="secondary">{totalProfiles} perfis</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {phase === "generating" &&
                `A gerar mensagens personalizadas... ${generationProgress.done} de ${generationProgress.total}`
              }
              {phase === "sending" &&
                `${sentCount} de ${effectiveTotal} envios confirmados${rejectedCount > 0 ? `, ${rejectedCount} rejeitado${rejectedCount > 1 ? 's' : ''}` : ''} — Abra o perfil, envie a mensagem e confirme`
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

          {phase === "sending" && profiles.length > 0 && (
            <div className="mt-3">
              <OutreachMediaPicker
                key={`common:${currentWorkspace?.id}:${profiles.map((p) => p.id).join(",")}`}
                title={`Conteúdo comum (aplica-se aos ${profiles.length} perfis, 1.ª mensagem)`}
                media={null}
                busy={mediaBusy}
                onSetUrl={(url) => media.setUrl.mutateAsync({ profileIds: profiles.map((p) => p.id), steps: [1], url })}
                onUpload={(file) => media.uploadVideo.mutateAsync({ profileIds: profiles.map((p) => p.id), steps: [1], file })}
                onRemove={() => media.remove.mutateAsync({ profileIds: profiles.map((p) => p.id), steps: [1] })}
              />
            </div>
          )}

          {phase === "sending" && focusMode && focusProfile && (
            <div className="mt-3">
              <OutreachMediaPicker
                key={`${currentWorkspace?.id}:${focusProfile.id}:1`}
                title={`Conteúdo para ${focusProfile.profile_name || "este perfil"}`}
                media={media.get(focusProfile.id, 1)}
                busy={mediaBusy}
                onSetUrl={(url) => { setOpenedIds(prev => { const n = new Set(prev); n.delete(focusProfile.id); return n; }); return media.setUrl.mutateAsync({ profileIds: [focusProfile.id], steps: [1], url }); }}
                onUpload={(file) => { setOpenedIds(prev => { const n = new Set(prev); n.delete(focusProfile.id); return n; }); return media.uploadVideo.mutateAsync({ profileIds: [focusProfile.id], steps: [1], file }); }}
                onRemove={() => { setOpenedIds(prev => { const n = new Set(prev); n.delete(focusProfile.id); return n; }); return media.remove.mutateAsync({ profileIds: [focusProfile.id], steps: [1] }); }}
              />
            </div>
          )}

          {/* Phase: Sending — modo foco (Power Hour) */}
          {phase === "sending" && focusMode && focusProfile && (
            <PowerHourFocusView
              profile={focusProfile}
              message={composeMessageWithLink(getMessageForProfile(focusProfile.id)?.message_plain || getMessageForProfile(focusProfile.id)?.message || "", media.get(focusProfile.id, 1)?.url)}
              opened={openedIds.has(focusProfile.id)}
              sentCount={sentCount}
              processedCount={sentCount + rejectedCount}
              total={totalProfiles}
              sessionStartedAt={sessionStartedAt}
              onMessageChange={(value) => setEditedMessages(prev => ({ ...prev, [focusProfile.id]: value }))}
              onOpen={() => handleCopyAndOpen(focusProfile)}
              onSent={() => handleConfirmSent(focusProfile)}
              onSkip={() => {
                setSkippedIds(prev => new Set(prev).add(focusProfile.id));
                setOpenedIds(prev => { const n = new Set(prev); n.delete(focusProfile.id); return n; });
              }}
              onReject={() => handleReject(focusProfile)}
            />
          )}

          {/* Phase: Sending — lista */}
          {phase === "sending" && (!focusMode || !focusProfile) && (
            <>
              {/* Instruction banner */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm mt-4">
                <ExternalLink className="w-5 h-5 text-primary flex-shrink-0" />
                <span>
                  Clique <strong>"Abrir perfil"</strong> para copiar a mensagem e abrir o canal disponível. 
                  Depois volte aqui e clique <strong>"Já enviei"</strong> para agendar os próximos passos. Pode converter o perfil em lead quando fizer sentido.
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
                              profile.platform === "instagram" ? <Instagram className="w-5 h-5 text-pink-500" /> : <ExternalLink className="w-5 h-5 text-muted-foreground" />
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
                                  Abrir perfil
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
                      Abrir perfil de {nextProfile.profile_name || "próximo perfil"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Close confirmation dialog */}
      <AlertDialog open={!!reviewProfile} onOpenChange={(value) => { if (!value) setReviewProfile(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possível contacto já existente</AlertDialogTitle>
            <AlertDialogDescription>
              {reviewProfile?.reason} Confirme que é outra entidade antes de abrir a abordagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReviewProfile(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (reviewProfile) void copyAndOpen(reviewProfile.profile); setReviewProfile(null); }}>
              É outro contacto, continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
