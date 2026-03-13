import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CountdownTimer } from "./CountdownTimer";
import { useState } from "react";
import { Gift, ArrowRight } from "lucide-react";

interface ExitIntentPopupProps {
  open: boolean;
  onClose: () => void;
  discountPercentage?: number;
  message?: string;
  countdownSeconds?: number;
  onEmailCapture?: (email: string) => void;
}

export function ExitIntentPopup({ open, onClose, discountPercentage = 10, message, countdownSeconds, onEmailCapture }: ExitIntentPopupProps) {
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email && onEmailCapture) onEmailCapture(email);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center gap-3">
            <Gift className="h-10 w-10 text-primary" />
            <span className="text-2xl">Espera! Tens um presente 🎁</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-3xl font-bold text-primary">-{discountPercentage}%</p>
          <p className="text-muted-foreground">
            {message || `Usa este desconto exclusivo de ${discountPercentage}% antes que expire!`}
          </p>
          {countdownSeconds && <CountdownTimer seconds={countdownSeconds} onExpire={onClose} label="Expira em" />}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input type="email" placeholder="O teu email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit"><ArrowRight className="h-4 w-4" /></Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
