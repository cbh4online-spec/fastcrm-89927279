import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, ArrowRight, X } from "lucide-react";
import { CountdownTimer } from "@/components/checkout/CountdownTimer";

interface StoreExitIntentPopupProps {
  workspaceSlug: string;
  discountCode?: string;
  discountPercent?: number;
}

export function StoreExitIntentPopup({
  workspaceSlug,
  discountCode = "VOLTA10",
  discountPercent = 10,
}: StoreExitIntentPopupProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const sessionKey = `exit_intent_shown_${workspaceSlug}`;

  const triggerPopup = useCallback(() => {
    if (sessionStorage.getItem(sessionKey)) return;
    setOpen(true);
    sessionStorage.setItem(sessionKey, "1");
  }, [sessionKey]);

  // Desktop: mouse leaves viewport from top
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.clientY <= 5) triggerPopup();
    };
    document.addEventListener("mouseleave", handler);
    return () => document.removeEventListener("mouseleave", handler);
  }, [triggerPopup]);

  // Mobile: rapid scroll up (back-button gesture)
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let rapidScrollCount = 0;

    const handler = () => {
      const delta = lastScrollY - window.scrollY;
      if (delta > 100) {
        rapidScrollCount++;
        if (rapidScrollCount >= 2) triggerPopup();
      } else {
        rapidScrollCount = 0;
      }
      lastScrollY = window.scrollY;
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [triggerPopup]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Could capture email via edge function here
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm text-center p-0 overflow-hidden border-0">
        {/* Top gradient accent */}
        <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />

        <div className="px-6 pb-6 pt-4">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="h-7 w-7 text-primary" />
              </div>
              <span className="text-xl font-bold">Espera! 🎁</span>
            </DialogTitle>
          </DialogHeader>

          {!submitted ? (
            <div className="mt-4 space-y-4">
              <p className="text-4xl font-black text-primary">-{discountPercent}%</p>
              <p className="text-sm text-muted-foreground">
                Deixa o teu email e recebe um desconto exclusivo de{" "}
                <span className="font-semibold text-foreground">{discountPercent}%</span> na tua compra!
              </p>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">O teu código:</p>
                <p className="text-lg font-mono font-bold tracking-widest text-primary">{discountCode}</p>
              </div>

              <CountdownTimer seconds={600} label="Expira em" onExpire={() => setOpen(false)} />

              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="O teu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" size="sm" className="gap-1.5">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <button
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                Não, obrigado
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-lg font-semibold">🎉 Código ativado!</p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-2xl font-mono font-bold tracking-widest text-primary">{discountCode}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Usa este código no checkout para {discountPercent}% de desconto.
              </p>
              <Button onClick={() => setOpen(false)} className="w-full">
                Continuar a comprar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
