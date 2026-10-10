import { useState, useEffect } from "react";
import { buildDmUrl, tryCopyText, type PreparedDm } from "@/lib/prospecting/dmWindow";
import { PreparedDmPanel } from "./PreparedDmPanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Copy, Check, RefreshCw, Loader2, Sparkles,
  Briefcase, MapPin, Instagram, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadEnricherSettings } from "@/hooks/useLeadEnricherSettings";
import { buildFollowUpRows, buildInitialOutreachRow } from "@/lib/prospecting/cadence";
import { confirmOutreachWithReview, REVIEW_CONFIRM_TEXT } from "@/lib/prospecting/outreachGate";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { checkProspectingIdentity, describeProspectingIdentity, isSeparateProspectingInstance, PROSPECTING_INSTANCE_NOT_READY_MESSAGE, SEPARATE_PROSPECTING_INSTANCE_MESSAGE } from "@/lib/prospecting/identity";
import { useQueryClient } from "@tanstack/react-query";
import { useOutreachMedia } from "@/hooks/useOutreachMedia";
import { OutreachMediaPicker } from "@/components/prospecting/OutreachMediaPicker";
import { composeMessageWithLink, sentMediaUrlFor } from "@/lib/prospecting/outreachMedia";

const extractInstagramUsername = (url: string): string | null => {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
  return match ? match[1] : null;
};

interface ProfileData {
  id: string;
  profile_url: string;
  profile_name: string | null;
  profile_bio: string | null;
  platform: string;
  inferred_profession: string | null;
  inferred_specialty: string | null;
  inferred_location: string | null;
  instagram_followers_count: number | null;
  instagram_category: string | null;
  instagram_is_verified: boolean | null;
  instagram_is_business: boolean | null;
  instagram_full_bio: string | null;
  extracted_email?: string | null;
  extracted_phone?: string | null;
  outreach_step?: number;
}

interface ProspectingMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  workspaceContext?: { name?: string; description?: string } | null;
  defaultTone?: Tone;
  onOutreachUpdate?: (profileId: string, step: number) => void;
}

type Tone = "formal" | "casual" | "direto";

interface StepMessage {
  message: string;
  message_plain: string;
  isLoading: boolean;
  generated: boolean;
}

const TONE_OPTIONS: { value: Tone; label: string; emoji: string }[] = [
  { value: "formal", label: "Formal", emoji: "👔" },
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "direto", label: "Direto", emoji: "🎯" },
];

const STEP_LABELS = [
  { label: "Abertura", desc: "Dia 0", emoji: "👋" },
  { label: "Follow-up", desc: "Dia 3", emoji: "💡" },
  { label: "Fecho", desc: "Dia 7", emoji: "🎯" },
];

export function ProspectingMessageDialog({
  open,
  onOpenChange,
  profile,
  workspaceContext,
  defaultTone = "casual",
  onOutreachUpdate,
}: ProspectingMessageDialogProps) {
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [activeStep, setActiveStep] = useState("1");
  const [copied, setCopied] = useState(false);
  const [openedStep, setOpenedStep] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { settings } = useLeadEnricherSettings();
  const { workspaceClient, instanceData, isLoading: isInstanceLoading, error: instanceError } = useWorkspaceInstance();
  const queryClient = useQueryClient();
  const media = useOutreachMedia([profile.id]);
  const stepMediaUrl = (stepNum: number) => media.get(profile.id, stepNum)?.url ?? null;
  const composedFor = (stepIdx: number) => composeMessageWithLink(steps[stepIdx].message, stepMediaUrl(stepIdx + 1));
  // Texto exato aberto (mensagem + ligação), gravado ao confirmar «Já enviei».
  const [openedSnapshot, setOpenedSnapshot] = useState<{ step: number; text: string; url: string | null } | null>(null);
  const [prepared, setPrepared] = useState<(PreparedDm & { step: number }) | null>(null);
  useEffect(() => {
    setOpenedStep(null);
    setOpenedSnapshot(null);
    setPrepared(null);
  }, [profile.id, currentWorkspace?.id]);

  const [steps, setSteps] = useState<StepMessage[]>([
    { message: "", message_plain: "", isLoading: false, generated: false },
    { message: "", message_plain: "", isLoading: false, generated: false },
    { message: "", message_plain: "", isLoading: false, generated: false },
  ]);

  // Sync tone when defaultTone changes
  useEffect(() => {
    if (!steps.some(s => s.generated)) {
      setTone(defaultTone);
    }
  }, [defaultTone]);

  const currentStep = parseInt(activeStep) - 1;
  const currentOutreachStep = profile.outreach_step || 0;
  const isInstagramProfile = profile.platform === "instagram";

  const generateMessage = async (stepIndex: number, selectedTone: Tone = tone) => {
    setOpenedStep((opened) => opened === stepIndex + 1 ? null : opened);
    setSteps(prev => {
      const next = [...prev];
      next[stepIndex] = { ...next[stepIndex], isLoading: true };
      return next;
    });

    try {
      const serviceContext = settings.service_offer
        ? { offer: settings.service_offer, painPoints: settings.service_pain_points }
        : undefined;

      const { data, error } = await supabase.functions.invoke("generate-prospecting-message", {
        body: {
          profile: {
            name: profile.profile_name,
            profession: profile.inferred_profession,
            specialty: profile.inferred_specialty,
            bio: profile.instagram_full_bio || profile.profile_bio,
            location: profile.inferred_location,
            followers: profile.instagram_followers_count,
            category: profile.instagram_category,
            isVerified: profile.instagram_is_verified,
            isBusiness: profile.instagram_is_business,
          },
          tone: selectedTone,
          workspaceContext,
          serviceContext,
          sequenceStep: stepIndex + 1,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSteps(prev => {
        const next = [...prev];
        next[stepIndex] = {
          message: data.message || "",
          message_plain: data.message_plain || "",
          isLoading: false,
          generated: true,
        };
        return next;
      });
    } catch (err) {
      toast.error("Erro ao gerar mensagem", {
        description: err instanceof Error ? err.message : "Tente novamente",
      });
      setSteps(prev => {
        const next = [...prev];
        next[stepIndex] = { ...next[stepIndex], isLoading: false };
        return next;
      });
    }
  };

  const generateAllSteps = async () => {
    // Generate all 3 steps in parallel
    await Promise.all([
      generateMessage(0),
      generateMessage(1),
      generateMessage(2),
    ]);
  };

  const canContactProfile = async (): Promise<boolean> => {
    if (!currentWorkspace?.id) throw new Error("Espaço de trabalho indisponível");
    if (isInstanceLoading || instanceError) throw new Error(PROSPECTING_INSTANCE_NOT_READY_MESSAGE);
    if (isSeparateProspectingInstance(instanceData?.supabase_url, import.meta.env.VITE_SUPABASE_URL)) throw new Error(SEPARATE_PROSPECTING_INSTANCE_MESSAGE);
    const identity = await checkProspectingIdentity(workspaceClient, currentWorkspace.id, {
        name: profile.profile_name || "Sem nome",
        email: profile.extracted_email,
        phone: profile.extracted_phone,
        profile_url: profile.profile_url,
        instagram_url: profile.platform === "instagram" ? profile.profile_url : null,
    }, profile.id);
    if (identity.status === "review") {
      return window.confirm(`${describeProspectingIdentity(identity)}\n\nConfirma que é outra entidade e pretende continuar?`);
    }
    if (identity.status !== "new") {
      toast.warning(describeProspectingIdentity(identity));
      return false;
    }
    return true;
  };

  // Passo 1: preparar (verificações + texto exato + cópia com foco no FastCRM). Não abre janelas.
  // Qualquer mudança de media invalida a preparação: é obrigatório preparar de novo.
  const invalidatePrepared = () => { setOpenedStep(null); setOpenedSnapshot(null); setPrepared(null); setCopied(false); };

  const handlePrepare = async (): Promise<boolean> => {
    const stepNum = currentStep + 1;
    setOpenedStep(null);
    setOpenedSnapshot(null);
    try {
      if (!await canContactProfile()) { setPrepared(null); return false; }
      const url = (await media.ensureFresh(profile.id, stepNum))?.url ?? null;
      const text = composeMessageWithLink(steps[currentStep].message, url);
      const copiedOk = await tryCopyText(text);
      setPrepared({ step: stepNum, text, mediaUrl: sentMediaUrlFor(text, url), dmUrl: buildDmUrl(extractInstagramUsername(profile.profile_url), profile.profile_url), copied: copiedOk });
      if (copiedOk) toast.success("Mensagem copiada. Clique em «Abrir conversa».");
      return copiedOk;
    } catch (error) {
      setPrepared(null);
      toast.error("Não foi possível preparar a abordagem", { description: error instanceof Error ? error.message : "Tente novamente" });
      return false;
    }
  };

  // Passo 2: só o clique real no link «Abrir conversa» ativa «Já enviei».
  const handleOpened = () => {
    if (!prepared || prepared.step !== currentStep + 1) return;
    setOpenedSnapshot({ step: prepared.step, text: prepared.text, url: prepared.mediaUrl });
    setOpenedStep(prepared.step);
  };

  useEffect(() => {
    setPrepared(null);
    setOpenedStep(null);
    setOpenedSnapshot(null);
  }, [currentStep, steps[currentStep]?.message]);

  const handleConfirmSent = async () => {
    const workspaceId = currentWorkspace?.id;
    if (!workspaceId) {
      toast.error("Espaço de trabalho indisponível");
      return;
    }
    const stepNum = currentStep + 1;
    if (openedStep !== stepNum || isSaving || openedSnapshot?.step !== stepNum) return;
    const sentFields = { sent_message: openedSnapshot.text, sent_media_url: openedSnapshot.url, sent_at: new Date().toISOString() };
    setIsSaving(true);
    const now = new Date();
    try {
      if (isInstanceLoading || instanceError) throw new Error(PROSPECTING_INSTANCE_NOT_READY_MESSAGE);
      if (isSeparateProspectingInstance(instanceData?.supabase_url, import.meta.env.VITE_SUPABASE_URL)) throw new Error(SEPARATE_PROSPECTING_INSTANCE_MESSAGE);
      // Fresh identity re-check + lock + queue/outreach_step in one transaction.
      await confirmOutreachWithReview(supabase, {
        workspaceId,
        profileId: profile.id,
        stepIndex: stepNum,
        sentMessage: openedSnapshot.text,
        mediaUrl: openedSnapshot.url,
        message: steps[currentStep].message,
        messagePlain: steps[currentStep].message_plain || steps[currentStep].message,
        tone,
        scheduleFollowUps: stepNum === 1,
        renumberLegacy: stepNum === 1,
        followUpMessages: [2, 3].map((s) => ({
          step_index: s,
          message: steps[s - 1]?.message || null,
          message_plain: steps[s - 1]?.message_plain || null,
        })),
      }, () => window.confirm(REVIEW_CONFIRM_TEXT));
      void sentFields; void now;
      onOutreachUpdate?.(profile.id, stepNum);
      queryClient.invalidateQueries({ queryKey: ["pending-outreach", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-outreach-count", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["prospecting-effectiveness", workspaceId] });
      toast.success(stepNum === 1 ? "Abordagem confirmada; próximos passos agendados" : "Envio confirmado");
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível registar o envio", { description: error instanceof Error ? error.message : "Tente novamente" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToneChange = (newTone: Tone) => {
    setTone(newTone);
    setOpenedStep(null);
    if (steps.some(s => s.generated)) {
      generateAllSteps();
    }
  };

  // Auto-generate all 3 when dialog opens
  useEffect(() => {
    if (open && !steps.some(s => s.generated) && !steps.some(s => s.isLoading)) {
      generateAllSteps();
    }
    if (!open) {
      setSteps([
        { message: "", message_plain: "", isLoading: false, generated: false },
        { message: "", message_plain: "", isLoading: false, generated: false },
        { message: "", message_plain: "", isLoading: false, generated: false },
      ]);
      setCopied(false);
      setOpenedStep(null);
      setActiveStep("1");
    }
  }, [open]);

  const charCount = steps[currentStep]?.message.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Sequência AIDA
          </DialogTitle>
          <DialogDescription>
            {isInstagramProfile ? "3 mensagens personalizadas para Instagram DM" : "3 mensagens para contacto assistido"}
          </DialogDescription>
        </DialogHeader>

        {/* Profile Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <div className="p-2 rounded-full bg-pink-500/10">
            <Instagram className="w-4 h-4 text-pink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {profile.profile_name || "Sem nome"}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {profile.inferred_profession && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {profile.inferred_profession}
                </span>
              )}
              {profile.inferred_location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.inferred_location}
                </span>
              )}
            </div>
          </div>
          {currentOutreachStep > 0 && (
            <Badge variant="secondary" className="text-xs">
              {currentOutreachStep}/3 enviadas
            </Badge>
          )}
        </div>

        {/* Tone Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tom:</span>
          {TONE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={tone === opt.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleToneChange(opt.value)}
              disabled={steps.some(s => s.isLoading)}
              className="gap-1"
            >
              <span>{opt.emoji}</span>
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Message Sequence Tabs */}
        <Tabs value={activeStep} onValueChange={setActiveStep}>
          <TabsList className="w-full">
            {STEP_LABELS.map((step, i) => (
              <TabsTrigger
                key={i + 1}
                value={String(i + 1)}
                className={cn(
                  "flex-1 gap-1",
                  currentOutreachStep > i && "text-green-600"
                )}
              >
                <span>{step.emoji}</span>
                <span className="hidden sm:inline">{step.label}</span>
                <span className="text-xs text-muted-foreground">({step.desc})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {[0, 1, 2].map((i) => (
            <TabsContent key={i} value={String(i + 1)} className="space-y-2 mt-3">
              {steps[i].isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">A gerar {STEP_LABELS[i].label.toLowerCase()}...</p>
                </div>
              ) : (
                <>
                  <Textarea
                    value={steps[i].message}
                    onChange={(e) => {
                      setOpenedStep(null);
                      setSteps(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], message: e.target.value, message_plain: e.target.value };
                        return next;
                      });
                    }}
                    placeholder="A mensagem gerada aparecerá aqui..."
                    className="min-h-[120px] resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className={cn(steps[i].message.length > 300 ? "text-destructive font-medium" : "")}>
                      {steps[i].message.length}/300 caracteres
                    </span>
                    {currentOutreachStep > i && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                        ✓ Enviada
                      </Badge>
                    )}
                  </div>
                  <OutreachMediaPicker
        loadState={media.isLoading ? "loading" : media.isError ? "error" : "ready"}
                    key={`${currentWorkspace?.id}:${profile.id}:${i + 1}`}
                    media={media.get(profile.id, i + 1)}
                    busy={media.setUrl.isPending || media.uploadVideo.isPending || media.remove.isPending}
                    onSetUrl={(url) => { invalidatePrepared(); return media.setUrl.mutateAsync({ profileIds: [profile.id], steps: [i + 1], url }); }}
                    onUpload={(file) => { invalidatePrepared(); return media.uploadVideo.mutateAsync({ profileIds: [profile.id], steps: [i + 1], file }); }}
                    onRemove={() => { invalidatePrepared(); return media.remove.mutateAsync({ profileIds: [profile.id], steps: [i + 1] }); }}
                  />
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMessage(currentStep)}
            disabled={steps.some(s => s.isLoading)}
            className="gap-1"
          >
            <RefreshCw className={cn("w-4 h-4", steps[currentStep]?.isLoading && "animate-spin")} />
            Regenerar
          </Button>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => { void handlePrepare().then((ok) => { setCopied(ok); if (ok) setTimeout(() => setCopied(false), 2000); }); }}
            disabled={!steps[currentStep]?.message || steps[currentStep]?.isLoading}
            className="gap-1"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handlePrepare}
            disabled={!steps[currentStep]?.message || steps[currentStep]?.isLoading || isSaving}
            className="gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            Preparar mensagem
          </Button>
          {openedStep === currentStep + 1 && (
            <Button size="sm" variant="outline" onClick={handleConfirmSent} disabled={isSaving} className="gap-1">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Já enviei
            </Button>
          )}
        </div>
        {prepared && prepared.step === currentStep + 1 && (
          <PreparedDmPanel
            prepared={prepared}
            onCopied={(ok) => setPrepared((p) => (p ? { ...p, copied: ok } : p))}
            onOpened={handleOpened}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
