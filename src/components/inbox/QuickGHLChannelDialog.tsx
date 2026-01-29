import { useState } from "react";
import { Phone, MessageSquare, Facebook, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { useWorkspaceGHLConfig } from "@/hooks/useWorkspaceGHLConfig";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { findOrCreateLeadByField, findOrCreateConversation, createOutboundMessage } from "./composeHelpers";

export type GHLChannel = "whatsapp" | "sms" | "facebook";

interface QuickGHLChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: GHLChannel;
}

const channelConfig: Record<GHLChannel, {
  label: string;
  icon: typeof Phone;
  color: string;
  placeholder: string;
  ghlType: string;
}> = {
  whatsapp: {
    label: "WhatsApp",
    icon: Phone,
    color: "text-green-500",
    placeholder: "+351 912 345 678",
    ghlType: "WhatsApp",
  },
  sms: {
    label: "SMS",
    icon: MessageSquare,
    color: "text-purple-500",
    placeholder: "+351 912 345 678",
    ghlType: "SMS",
  },
  facebook: {
    label: "Facebook Messenger",
    icon: Facebook,
    color: "text-indigo-500",
    placeholder: "+351 912 345 678",
    ghlType: "FB",
  },
};

export function QuickGHLChannelDialog({
  open,
  onOpenChange,
  channel,
}: QuickGHLChannelDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { config: ghlConfig, isConfigured } = useWorkspaceGHLConfig();
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const config = channelConfig[channel];
  const Icon = config.icon;

  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate("/dashboard/settings/channels");
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/[^\d+]/g, "");
  };

  const handleSend = async () => {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    if (!normalizedPhone || !message.trim()) {
      toast.error("Preencha o número de telefone e a mensagem");
      return;
    }

    if (!isConfigured || !ghlConfig) {
      toast.error("Configure a integração GHL nas Definições > Canais");
      return;
    }

    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return;
    }

    setIsSending(true);
    try {
      const leadId = await findOrCreateLeadByField(
        currentWorkspace.id,
        "phone",
        normalizedPhone,
        {
          phone: normalizedPhone,
          name: contactName.trim() || `Contacto ${normalizedPhone}`,
          source: channel === "whatsapp" ? "whatsapp" : "sms",
          status: "new",
          created_by: user?.id,
        }
      );

      const conversationId = await findOrCreateConversation(
        currentWorkspace.id,
        leadId,
        channel,
        { phone: normalizedPhone, ghl_type: config.ghlType }
      );

      // Send message via GHL edge function
      const { error } = await supabase.functions.invoke("ghl-send-message", {
        body: {
          workspaceId: currentWorkspace.id,
          conversationId: conversationId,
          message: message.trim(),
          channel: config.ghlType,
          phone: normalizedPhone,
        },
      });

      if (error) throw error;

      // Create message record
      await createOutboundMessage(currentWorkspace.id, conversationId, message.trim());

      toast.success(`Mensagem ${config.label} enviada com sucesso!`);
      onOpenChange(false);
      setPhoneNumber("");
      setContactName("");
      setMessage("");
    } catch (error: unknown) {
      console.error("Error sending message:", error);
      const errorMessage = error instanceof Error ? error.message : `Erro ao enviar mensagem ${config.label}`;
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
            <Icon className={`w-5 h-5 ${config.color}`} />
            Nova Mensagem {config.label}
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem através do {config.label}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isConfigured ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Integração GHL não configurada
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    Para enviar mensagens por {config.label}, configure a integração GoHighLevel nas definições.
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
                  Integração GHL activa
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Número de telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={config.placeholder}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Inclua o código do país (ex: +351 para Portugal)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-name">Nome do contacto (opcional)</Label>
                <Input
                  id="contact-name"
                  placeholder="Nome do contacto"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
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
          {isConfigured && (
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
              Enviar {config.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
