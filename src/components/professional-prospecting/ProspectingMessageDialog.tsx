import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy, Check, RefreshCw, Loader2, Sparkles,
  MessageSquare, User, Briefcase, MapPin, Instagram,
  Send, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface ProspectingMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  workspaceContext?: { name?: string; description?: string } | null;
  defaultTone?: Tone;
}

type Tone = "formal" | "casual" | "direto";

const TONE_OPTIONS: { value: Tone; label: string; emoji: string }[] = [
  { value: "formal", label: "Formal", emoji: "👔" },
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "direto", label: "Direto", emoji: "🎯" },
];

export function ProspectingMessageDialog({
  open,
  onOpenChange,
  profile,
  workspaceContext,
  defaultTone = "casual",
}: ProspectingMessageDialogProps) {
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>(defaultTone);

  // Sync tone when defaultTone changes
  useEffect(() => {
    if (!hasGenerated) {
      setTone(defaultTone);
    }
  }, [defaultTone]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateMessage = async (selectedTone: Tone = tone) => {
    setIsGenerating(true);
    try {
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
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMessage(data.message || "");
      setHasGenerated(true);
    } catch (err) {
      toast.error("Erro ao gerar mensagem", {
        description: err instanceof Error ? err.message : "Tente novamente",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleSendInstagram = async () => {
    try {
      await navigator.clipboard.writeText(message);
      window.open(profile.profile_url, "_blank");
      toast.success("Mensagem copiada! A abrir perfil...");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao copiar mensagem");
    }
  };

  const handleToneChange = (newTone: Tone) => {
    setTone(newTone);
    if (hasGenerated) {
      generateMessage(newTone);
    }
  };

  // Auto-generate when dialog opens
  useEffect(() => {
    if (open && !hasGenerated && !isGenerating) {
      generateMessage();
    }
    if (!open) {
      setMessage("");
      setHasGenerated(false);
      setCopied(false);
    }
  }, [open]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const charCount = message.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar Mensagem IA
          </DialogTitle>
          <DialogDescription>
            Mensagem personalizada com método AIDA para Instagram DM
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
              disabled={isGenerating}
              className="gap-1"
            >
              <span>{opt.emoji}</span>
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Message Area */}
        <div className="space-y-2">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A gerar mensagem personalizada...</p>
            </div>
          ) : (
            <>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="A mensagem gerada aparecerá aqui..."
                className="min-h-[140px] resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className={cn(charCount > 300 ? "text-destructive font-medium" : "")}>
                  {charCount}/300 caracteres
                </span>
                {charCount > 300 && (
                  <span className="text-destructive">Ideal: máx. 300 para Instagram DM</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateMessage()}
            disabled={isGenerating}
            className="gap-1"
          >
            <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
            Regenerar
          </Button>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!message || isGenerating}
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
            disabled={!message || isGenerating}
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
