import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { useWhatsAppTestSend } from "@/hooks/useWhatsAppOps";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function WhatsAppTestSendDialog({ open, onOpenChange }: Props) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Mensagem de teste enviada a partir do painel.");
  const testSend = useWhatsAppTestSend();

  const handleSend = async () => {
    if (!phone.trim() || !message.trim()) return;
    try {
      await testSend.mutateAsync({ phone: phone.trim(), message: message.trim() });
      onOpenChange(false);
      setPhone("");
    } catch {
      // toast já tratado no hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar mensagem de teste</DialogTitle>
          <DialogDescription>
            Envia uma mensagem real pela tua instância WhatsApp para validar que tudo está operacional.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="test-phone">Número destino</Label>
            <Input
              id="test-phone"
              placeholder="ex: 912345678 ou 351912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={testSend.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Aceita formato nacional (9 dígitos) — assumimos +351 automaticamente.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-msg">Mensagem</Label>
            <Textarea
              id="test-msg"
              rows={4}
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={testSend.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={testSend.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={testSend.isPending || !phone.trim() || !message.trim()} className="gap-1.5">
            {testSend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
