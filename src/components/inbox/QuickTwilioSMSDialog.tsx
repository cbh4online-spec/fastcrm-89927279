import { useState } from "react";
import { Phone, Send, Loader2 } from "lucide-react";
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
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface QuickTwilioSMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickTwilioSMSDialog({ open, onOpenChange }: QuickTwilioSMSDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!phone.trim() || !message.trim() || !currentWorkspace?.id) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-send-sms", {
        body: {
          workspaceId: currentWorkspace.id,
          to: phone.trim(),
          message: message.trim(),
        },
      });

      if (error) {
        let errorMsg = "Falha ao enviar SMS";
        try {
          const ctx = (error as any)?.context;
          if (ctx?.json) {
            const body = await ctx.json();
            errorMsg = body?.error || errorMsg;
          } else if (data?.error) {
            errorMsg = data.error;
          }
        } catch {
          errorMsg = data?.error || error.message || errorMsg;
        }
        throw new Error(errorMsg);
      }
      if (data?.error) throw new Error(data.error);

      toast.success("SMS enviado com sucesso via Twilio!");
      onOpenChange(false);
      setPhone("");
      setMessage("");
    } catch (error: any) {
      console.error("[QuickTwilioSMSDialog] Error:", error);
      toast.error(error.message || "Erro ao enviar SMS");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-purple-500" />
            SMS via Twilio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sms-phone">Número de destino (E.164)</Label>
            <Input
              id="sms-phone"
              placeholder="+351912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sms-body">Mensagem</Label>
            <Textarea
              id="sms-body"
              placeholder="Escreva a sua mensagem SMS..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1600}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1600
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !phone.trim() || !message.trim()}
            className="gap-2 bg-purple-500 hover:bg-purple-600"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar SMS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
