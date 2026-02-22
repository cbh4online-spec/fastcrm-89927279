import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Copy, Check, Loader2, Send, ExternalLink, Instagram,
  CheckCircle, AlertCircle, SkipForward
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const totalProfiles = profiles.length;
  const sentCount = sentIds.size;
  const progressPercent = isGenerating
    ? (generationProgress.done / generationProgress.total) * 100
    : (sentCount / totalProfiles) * 100;

  const getMessageForProfile = (profileId: string) => {
    return generatedMessages.find(m => m.profileId === profileId);
  };

  const handleCopyAndOpen = async (profile: BulkProfile) => {
    const msg = getMessageForProfile(profile.id);
    if (!msg || !msg.message) return;

    try {
      await navigator.clipboard.writeText(msg.message_plain || msg.message);
      setCopiedId(profile.id);
      setTimeout(() => setCopiedId(null), 2000);

      // Open Instagram profile
      window.open(profile.profile_url, "_blank");

      // Mark as sent
      await markAsSent(profile);
    } catch {
      toast.error("Erro ao copiar mensagem");
    }
  };

  const markAsSent = async (profile: BulkProfile) => {
    setSentIds(prev => new Set(prev).add(profile.id));

    // Update outreach_step
    await supabase
      .from("professional_prospecting_profiles")
      .update({ outreach_step: 1 } as any)
      .eq("id", profile.id);

    // Schedule follow-ups in outreach queue
    if (currentWorkspace?.id) {
      const now = new Date();
      const day3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      await supabase.from("prospecting_outreach_queue").insert([
        {
          workspace_id: currentWorkspace.id,
          profile_id: profile.id,
          sequence_step: 2,
          scheduled_for: day3.toISOString(),
          status: "scheduled",
        },
        {
          workspace_id: currentWorkspace.id,
          profile_id: profile.id,
          sequence_step: 3,
          scheduled_for: day7.toISOString(),
          status: "scheduled",
        },
      ] as any);
    }
  };

  const handleNextProfile = () => {
    const nextProfile = profiles.find(p => !sentIds.has(p.id) && getMessageForProfile(p.id)?.message);
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Outreach em Massa</span>
            <Badge variant="secondary">{totalProfiles} perfis</Badge>
          </DialogTitle>
          <DialogDescription>
            {isGenerating
              ? `A gerar mensagens... ${generationProgress.done}/${generationProgress.total}`
              : `${sentCount}/${totalProfiles} enviados`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {isGenerating
              ? `${generationProgress.done}/${generationProgress.total} gerados`
              : `${sentCount}/${totalProfiles} enviados`
            }
          </p>
        </div>

        {/* Profiles List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="space-y-3 pr-4">
            {profiles.map(profile => {
              const msg = getMessageForProfile(profile.id);
              const isSent = sentIds.has(profile.id);
              const hasError = msg?.error;
              const hasMessage = msg?.message;

              return (
                <div
                  key={profile.id}
                  className={cn(
                    "border rounded-lg p-3 transition-all",
                    isSent && "bg-muted/50 border-green-500/30",
                    hasError && "border-destructive/30"
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
                          Enviado!
                        </Badge>
                      ) : hasMessage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => handleCopyAndOpen(profile)}
                        >
                          {copiedId === profile.id ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Copiar + Abrir
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          <div className="flex items-center gap-2">
            {!isGenerating && sentCount < totalProfiles && (
              <Button onClick={handleNextProfile} className="gap-2">
                <SkipForward className="w-4 h-4" />
                Próximo perfil
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
