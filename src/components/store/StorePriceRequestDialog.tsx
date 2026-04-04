import { useState } from "react";
import { MessageSquareText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreateStorePriceRequest } from "@/hooks/useStorePriceRequests";

interface StorePriceRequestDialogProps {
  productId: string;
  productName: string;
  workspaceId: string;
  trigger?: React.ReactNode;
}

export function StorePriceRequestDialog({
  productId,
  productName,
  workspaceId,
  trigger,
}: StorePriceRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const createRequest = useCreateStorePriceRequest();

  const isValid = name.trim().length > 0 && email.trim().length > 0 && email.includes("@");

  const handleSubmit = () => {
    if (!isValid) return;
    createRequest.mutate(
      {
        workspace_id: workspaceId,
        product_id: productId,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
        message: message.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setTimeout(() => {
            setOpen(false);
            setSubmitted(false);
            setName("");
            setEmail("");
            setPhone("");
            setMessage("");
          }, 2500);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSubmitted(false); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full gap-2 rounded-xl h-12 text-base font-semibold">
            <MessageSquareText className="h-5 w-5" />
            Pedir Preço
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h3 className="text-lg font-semibold">Pedido Enviado!</h3>
            <p className="text-sm text-muted-foreground text-center">
              Entraremos em contacto brevemente com o preço para <strong>{productName}</strong>.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5" />
                Pedir Preço
              </DialogTitle>
              <DialogDescription>
                Solicite uma cotação para <strong>{productName}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" maxLength={255} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Telefone (opcional)</Label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 9xx xxx xxx" maxLength={20} />
              </div>

              <div className="space-y-1.5">
                <Label>Mensagem (opcional)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Descreva o que precisa..."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!isValid || createRequest.isPending}
              >
                {createRequest.isPending ? "A enviar..." : "Enviar Pedido de Preço"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
