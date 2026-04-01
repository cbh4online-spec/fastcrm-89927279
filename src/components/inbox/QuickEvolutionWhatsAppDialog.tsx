import { useState } from "react";
import { Phone, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWhatsAppQRConnection } from "@/hooks/useWhatsAppQRConnection";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { findOrCreateLeadByField, findOrCreateConversation, createOutboundMessage } from "./composeHelpers";

interface QuickEvolutionWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEvolutionWhatsAppDialog({
  open,
  onOpenChange,
}: QuickEvolutionWhatsAppDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: qrConnection } = useWhatsAppQRConnection();
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isConnected = qrConnection?.status === "connected";

  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate("/dashboard/settings/integrations");
  };

  const handleSend = async () => {
    const normalizedPhone = phoneNumber.replace(/[^\d+]/g, "");

    if (!normalizedPhone || !message.trim()) {
      toast.error("Preencha o número de telefone e a mensagem");
      return;
    }

    if (!isConnected) {
      toast.error("WhatsApp não está conectado via QR");
      return;
    }

    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return;
    }

    setIsSending(true);
    try {
      // Create/find lead
      const leadId = await findOrCreateLeadByField(
        currentWorkspace.id,
        "phone",
        normalizedPhone,
        {
          phone: normalizedPhone,
          name: contactName.trim() || `Contacto ${normalizedPhone}`,
          source: "whatsapp",
          status: "new",
          created_by: user?.id,
        }
      );

      // Create/find conversation
      const conversationId = await findOrCreateConversation(
        currentWorkspace.id,
        leadId,
        "whatsapp",
        { phone: normalizedPhone, provider: "evolution_qr" }
      );

      // Send via Evolution API
      const { error } = await supabase.functions.invoke("whatsapp-evolution-send", {
        body: {
          workspaceId: currentWorkspace.id,
          phone: normalizedPhone,
          message: message.trim(),
        },
      });

      if (error) throw error;

      // Record outbound message
      await createOutboundMessage(currentWorkspace.id, conversationId, message.trim());

      toast.success("Mensagem WhatsApp enviada com sucesso!");
      onOpenChange(false);
      setPhoneNumber("");
      setContactName("");
      setMessage("");
    } catch (error: unknown) {
      console.error("[WHATSAPP_EVOLUTION] Send error:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao enviar mensagem WhatsApp";
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-500" />
            Nova Mensagem WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem através do WhatsApp (Evolution QR)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isConnected ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    WhatsApp não conectado
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    Para enviar mensagens por WhatsApp, conecte via QR Code nas definições de integrações.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToSettings}
                className="w-full"
              >
                Ir para Definições
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  WhatsApp (Evolution QR) conectado
                  {qrConnection?.phone_number && ` — ${qrConnection.phone_number}`}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evo-phone">Número de telefone *</Label>
                <Input
                  id="evo-phone"
                  type="tel"
                  placeholder="+351 912 345 678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Inclua o código do país (ex: +351 para Portugal)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evo-contact-name">Nome do contacto (opcional)</Label>
                <Input
                  id="evo-contact-name"
                  placeholder="Nome do contacto"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evo-message">Mensagem *</Label>
                <Textarea
                  id="evo-message"
                  placeholder="Escreva a sua mensagem..."
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {isConnected && (
            <Button
              onClick={handleSend}
              disabled={isSending || !phoneNumber.trim() || !message.trim()}
              className="gap-2 bg-green-500 hover:bg-green-600"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar WhatsApp
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
