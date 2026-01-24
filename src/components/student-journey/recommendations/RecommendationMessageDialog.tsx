// Dialog to generate and send a personalized message

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, RefreshCw, Copy, Check, Send } from "lucide-react";
import { useSJRecommendations } from "@/hooks/useSJRecommendations";
import { toast } from "sonner";

interface RecommendationMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  profileName: string;
  courseId: string;
  courseName: string;
  onMessageSent?: () => void;
}

export function RecommendationMessageDialog({
  open,
  onOpenChange,
  profileId,
  profileName,
  courseId,
  courseName,
  onMessageSent,
}: RecommendationMessageDialogProps) {
  const { generateMessage } = useSJRecommendations(profileId);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [cta, setCta] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    try {
      const result = await generateMessage.mutateAsync({
        targetProfileId: profileId,
        courseId,
      });

      if (result) {
        setSubject(result.subject || "");
        setMessage(result.message || "");
        setCta(result.cta || "");
      }
    } catch (error) {
      console.error("Error generating message:", error);
    }
  };

  const handleCopy = async () => {
    const fullMessage = subject ? `Assunto: ${subject}\n\n${message}\n\n${cta}` : `${message}\n\n${cta}`;
    await navigator.clipboard.writeText(fullMessage);
    setCopied(true);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    // In a real implementation, this would integrate with an email/SMS service
    toast.success("Mensagem marcada como enviada");
    onMessageSent?.();
    handleClose();
  };

  const handleClose = () => {
    setSubject("");
    setMessage("");
    setCta("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Mensagem Personalizada
          </DialogTitle>
          <DialogDescription>
            Convite para {profileName} sobre "{courseName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generateMessage.isPending}
              className="gap-2"
            >
              {generateMessage.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  A gerar...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar com IA
                </>
              )}
            </Button>
          </div>

          {/* Subject (for email) */}
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto (email)</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Assunto do email..."
            />
          </div>

          {/* Message Body */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva ou gere uma mensagem personalizada..."
              rows={6}
            />
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <Label htmlFor="cta">Call to Action</Label>
            <Input
              id="cta"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="Ex: Reserve já o seu lugar!"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!message}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar
              </>
            )}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Marcar Enviado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
