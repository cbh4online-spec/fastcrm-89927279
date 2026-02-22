import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import {
  Copy, Check, Loader2, Send, ExternalLink, Instagram,
  CheckCircle, AlertCircle, SkipForward, PartyPopper
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
}

export function BulkOutreachDialog({
  open,
  onOpenChange,
  profiles,
  generatedMessages,
  isGenerating,
  generationProgress,
  onComplete,
}: BulkOutreachDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const activeProfileRef = useRef<HTMLDivElement>(null);

  const totalProfiles = profiles.length;
  const sentCount = sentIds.size;
  const allDone = sentCount >= totalProfiles && totalProfiles > 0;

  const progressPercent = isGenerating
    ? (generationProgress.done / generationProgress.total) * 100
    : (sentCount / totalProfiles) * 100;

  // Find the next unsent profile
  const nextProfile = profiles.find(p => !sentIds.has(p.id) && getMessageForProfile(p.id)?.message);

  // Auto-scroll to next profile
  useEffect(() => {
    if (!isGenerating && activeProfileRef.current) {
      activeProfileRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [sentCount, isGenerating]);

  function getMessageForProfile(profileId: string) {
    return generatedMessages.find(m => m.profileId === profileId);
  }

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

      await markAsSent(profile);
    } catch {
      toast.error("Erro ao copiar mensagem");
    }
  };

  const markAsSent = async (profile: BulkProfile) => {
    setSentIds(prev => new Set(prev).add(profile.id));

    await supabase
      .from("professional_prospecting_profiles")
      .update({ outreach_step: 1 } as any)
      .eq("id", profile.id);

    if (currentWorkspace?.id) {
      const now = new Date();
      const day3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await supabase.from("prospecting_outreach_queue").insert([
        {
          workspace_id: currentWorkspace.id,
          profile_id: profile.id,
          step_index: 2,
          scheduled_for: day3.toISOString(),
          status: "scheduled",
        },
        {
          workspace_id: currentWorkspace.id,
          profile_id: profile.id,
          step_index: 3,
          scheduled_for: day7.toISOString(),
          status: "scheduled",
        },
      ] as any);
    }
  };

  const handleNextProfile = () => {
    if (nextProfile) {
      handleCopyAndOpen(nextProfile);
    } else {
      toast.info("Todos os perfis foram processados!");
    }
  };

  const handleClose = () => {
    if (sentCount > 0) {
      onComplete();
    }
    setSentIds(new Set());
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Block close during generation
      if (isGenerating) return;
      // Confirm close if there are unsent profiles with progress
      if (sentCount > 0 && sentCount < totalProfiles) {
        setShowCloseConfirm(true);
        return;
      }
      // If messages are generated but none sent yet, also confirm
      if (!isGenerating && generatedMessages.length > 0 && sentCount === 0 && !allDone) {
        setShowCloseConfirm(true);
        return;
      }
      handleClose();
    }
  };

  // Determine current phase
  const phase: "generating" | "sending" | "completed" = isGenerating
    ? "generating"
    : allDone
      ? "completed"
      : "sending";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] flex flex-col"
          onPointerDownOutside={(e) => {
            if (isGenerating || (sentCount > 0 && sentCount < totalProfiles)) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isGenerating) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {phase === "generating" && "A preparar mensagens..."}
                {phase === "sending" && "Outreach em Massa"}
                {phase === "completed" && "Outreach Concluído! 🎉"}
              </span>
              <Badge variant="secondary">{totalProfiles} perfis</Badge>
            </DialogTitle>
            <DialogDescription>
              {phase === "generating" &&
                `A gerar mensagens personalizadas... ${generationProgress.done} de ${generationProgress.total}`
              }
              {phase === "sending" &&
                `${sentCount} de ${totalProfiles} enviados — Clique no botão abaixo para copiar e abrir o Instagram`
              }
              {phase === "completed" &&
                `Todos os ${totalProfiles} perfis foram contactados com sucesso!`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {phase === "generating"
                ? `${generationProgress.done}/${generationProgress.total} gerados`
                : `${sentCount}/${totalProfiles} enviados`
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
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0" />
                <span>
                  Clique <strong>"Abrir DM"</strong> para copiar a mensagem e abrir o Instagram. 
                  Cole <strong>(Ctrl+V)</strong> na conversa e envie.
                </span>
              </div>

              {/* Profiles List */}
              <ScrollArea className="flex-1 min-h-0 max-h-[40vh]">
                <div className="space-y-2 pr-4">
                  {profiles.map(profile => {
                    const msg = getMessageForProfile(profile.id);
                    const isSent = sentIds.has(profile.id);
                    const hasError = msg?.error;
                    const hasMessage = msg?.message;
                    const isNext = nextProfile?.id === profile.id;

                    return (
                      <div
                        key={profile.id}
                        ref={isNext ? activeProfileRef : undefined}
                        className={cn(
                          "border rounded-lg p-3 transition-all",
                          isSent && "bg-muted/50 border-green-500/30 opacity-60",
                          hasError && "border-destructive/30",
                          isNext && "ring-2 ring-primary border-primary/50 bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status Icon */}
                          <div className="mt-0.5">
                            {isSent ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : hasError ? (
                              <AlertCircle className="w-5 h-5 text-destructive" />
                            ) : !hasMessage && isGenerating ? (
                              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            ) : (
                              <Instagram className="w-5 h-5 text-pink-500" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {profile.profile_name || "Sem nome"}
                              </span>
                              {isNext && (
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
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
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
                            {isSent ? (
                              <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs">
                                Enviado ✓
                              </Badge>
                            ) : hasMessage ? (
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
                <p className="text-lg font-semibold">{totalProfiles}/{totalProfiles} enviados!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Todos os perfis foram contactados. Os follow-ups foram agendados automaticamente.
                </p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
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
                <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
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
        </DialogContent>
      </Dialog>

      {/* Close confirmation dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Ainda tem {totalProfiles - sentCount} perfil(is) por enviar. 
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
