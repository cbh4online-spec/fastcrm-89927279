import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Send, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { useSendWhatsAppZapi } from "@/hooks/useWhatsAppZapi";

interface WhatsAppInteractiveButtonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required: persist outbound msg in this conversation */
  conversationId?: string;
  /** Optional: route to specific phone (DM) */
  phone?: string;
  /** Optional: route to specific group */
  groupId?: string;
}

interface ButtonItem {
  id: string;
  label: string;
}

const MAX_BUTTONS = 3;
const BUTTON_LABEL_MAX = 20;

function newButton(): ButtonItem {
  return { id: crypto.randomUUID(), label: "" };
}

export function WhatsAppInteractiveButtonsDialog({
  open,
  onOpenChange,
  conversationId,
  phone,
  groupId,
}: WhatsAppInteractiveButtonsDialogProps) {
  const sendMutation = useSendWhatsAppZapi();

  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<ButtonItem[]>([newButton(), newButton()]);

  const reset = () => {
    setHeader("");
    setBody("");
    setFooter("");
    setButtons([newButton(), newButton()]);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const updateButton = (id: string, label: string) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)));
  };

  const removeButton = (id: string) => {
    setButtons((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== id) : prev));
  };

  const addButton = () => {
    if (buttons.length >= MAX_BUTTONS) return;
    setButtons((prev) => [...prev, newButton()]);
  };

  const validButtons = buttons
    .map((b) => ({ id: b.id, label: b.label.trim() }))
    .filter((b) => b.label.length > 0);

  const canSend =
    body.trim().length > 0 &&
    validButtons.length >= 1 &&
    validButtons.every((b) => b.label.length <= BUTTON_LABEL_MAX) &&
    (!!conversationId || !!phone || !!groupId);

  const handleSend = async () => {
    if (!canSend) {
      toast.error("Preencha mensagem e pelo menos 1 botão (até 20 caracteres)");
      return;
    }
    try {
      await sendMutation.mutateAsync({
        conversationId,
        phone,
        groupId,
        message: body.trim(),
        buttons: validButtons,
        buttonHeader: header.trim() || undefined,
        buttonFooter: footer.trim() || undefined,
      });
      toast.success("Mensagem com botões enviada");
      handleClose(false);
    } catch {
      // mutation já notifica
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-green-500" />
            Mensagem com Botões
          </DialogTitle>
          <DialogDescription>
            WhatsApp suporta até 3 botões de resposta rápida (máx. 20 caracteres cada).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="zapi-btn-header">Cabeçalho (opcional)</Label>
            <Input
              id="zapi-btn-header"
              placeholder="Ex: Confirmação de reserva"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zapi-btn-body">Mensagem *</Label>
            <Textarea
              id="zapi-btn-body"
              placeholder="Texto principal da mensagem..."
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1024}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Botões *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addButton}
                disabled={buttons.length >= MAX_BUTTONS}
                className="h-7 gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                Adicionar botão
              </Button>
            </div>
            <div className="space-y-2">
              {buttons.map((b, idx) => {
                const overflow = b.label.length > BUTTON_LABEL_MAX;
                return (
                  <div key={b.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                    <Input
                      placeholder={`Texto do botão ${idx + 1}`}
                      value={b.label}
                      onChange={(e) => updateButton(b.id, e.target.value)}
                      className={overflow ? "border-destructive" : undefined}
                    />
                    <span
                      className={`text-[10px] tabular-nums w-8 text-right ${
                        overflow ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {b.label.length}/{BUTTON_LABEL_MAX}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeButton(b.id)}
                      disabled={buttons.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zapi-btn-footer">Rodapé (opcional)</Label>
            <Input
              id="zapi-btn-footer"
              placeholder="Ex: Equipa de Suporte"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              maxLength={60}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || sendMutation.isPending}
            className="gap-2 bg-green-500 hover:bg-green-600"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar com botões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
