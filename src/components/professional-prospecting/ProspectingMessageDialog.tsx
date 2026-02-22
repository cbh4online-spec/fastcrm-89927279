import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy, Check, RefreshCw, Loader2, Sparkles,
  MessageSquare, User, Briefcase, MapPin, Instagram,
  Send, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadEnricherSettings } from "@/hooks/useLeadEnricherSettings";

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
  const { settings } = useLeadEnricherSettings();

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

  const generateMessage = async (stepIndex: number, selectedTone: Tone = tone) => {
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(steps[currentStep].message);
      setCopied(true);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleSendInstagram = async () => {
    const stepNum = currentStep + 1;
    try {
      await navigator.clipboard.writeText(steps[currentStep].message);
      window.open(profile.profile_url, "_blank");
      toast.success("Mensagem copiada! A abrir perfil...");

      // Update outreach step
      if (stepNum > currentOutreachStep) {
        await supabase
          .from("professional_prospecting_profiles")
          .update({ outreach_step: stepNum } as any)
          .eq("id", profile.id);
        onOutreachUpdate?.(profile.id, stepNum);
      }

      onOpenChange(false);
    } catch {
      toast.error("Erro ao copiar mensagem");
    }
  };

  const handleToneChange = (newTone: Tone) => {
    setTone(newTone);
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
            3 mensagens personalizadas para Instagram DM
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
                      setSteps(prev => {
                        const next = [...prev];
                        next[i] = { ...next[i], message: e.target.value };
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
            onClick={handleCopy}
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
            onClick={handleSendInstagram}
            disabled={!steps[currentStep]?.message || steps[currentStep]?.isLoading}
            className="gap-1"
          >
            <Send className="w-4 h-4" />
            Enviar no Instagram
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
