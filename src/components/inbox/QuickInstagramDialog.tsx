import { useState } from "react";
import { Instagram, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { useInstagramConnection } from "@/hooks/useInstagramConnection";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { findOrCreateLeadByField, findOrCreateConversation, createOutboundMessage } from "./composeHelpers";

interface QuickInstagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickInstagramDialog({
  open,
  onOpenChange,
}: QuickInstagramDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { data: instagramConnection } = useInstagramConnection();
  const navigate = useNavigate();
  
  const [instagramUsername, setInstagramUsername] = useState("");
  const [contactName, setContactName] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const isConnected = instagramConnection?.is_active;

  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate("/dashboard/settings/channels");
  };

  const normalizeUsername = (username: string): string => {
    return username.replace(/^@/, "").trim().toLowerCase();
  };

  const handleSend = async () => {
    const normalizedUsername = normalizeUsername(instagramUsername);
    
    if (!normalizedUsername || !message.trim()) {
      toast.error("Preencha o username do Instagram e a mensagem");
      return;
    }

    if (!isConnected || !instagramConnection) {
      toast.error("Configure a conexão Instagram nas Definições > Canais");
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
        "instagram_username",
        normalizedUsername,
        {
          instagram_username: normalizedUsername,
          name: contactName.trim() || `@${normalizedUsername}`,
          source: "instagram",
          status: "new",
          created_by: user?.id,
        }
      );

      const conversationId = await findOrCreateConversation(
        currentWorkspace.id,
        leadId,
        "instagram",
        { instagram_username: normalizedUsername }
      );

      // Send message via Instagram edge function
      const { error } = await supabase.functions.invoke("instagram-send-message", {
        body: {
          workspaceId: currentWorkspace.id,
          conversationId: conversationId,
          recipientUsername: normalizedUsername,
          message: message.trim(),
        },
      });

      if (error) throw error;

      // Create message record
      await createOutboundMessage(currentWorkspace.id, conversationId, message.trim());

      toast.success("Mensagem Instagram enviada com sucesso!");
      onOpenChange(false);
      setInstagramUsername("");
      setContactName("");
      setMessage("");
    } catch (error: unknown) {
      console.error("Error sending Instagram message:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao enviar mensagem Instagram";
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
            <Instagram className="w-5 h-5 text-pink-500" />
            Nova Mensagem Instagram DM
          </DialogTitle>
          <DialogDescription>
            Envie uma mensagem directa no Instagram
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isConnected ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Instagram não conectado
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    Para enviar mensagens no Instagram, conecte a sua conta nas definições.
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
                  Conectado como @{instagramConnection.instagram_username}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram-username">Username do destinatário *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="instagram-username"
                    className="pl-7"
                    placeholder="username"
                    value={instagramUsername}
                    onChange={(e) => setInstagramUsername(e.target.value)}
                  />
                </div>
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
          {isConnected && (
            <Button
              onClick={handleSend}
              disabled={isSending || !instagramUsername.trim() || !message.trim()}
              className="gap-2 bg-pink-500 hover:bg-pink-600"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Enviar DM
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
