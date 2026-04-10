import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const DELAY_MS = 45_000; // 45 seconds on page
const COOLDOWN_KEY = "insane_offer_shown";
const COOLDOWN_HOURS = 24;

export function LandingInsaneOfferPopup() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const shouldShow = useCallback(() => {
    const lastShown = localStorage.getItem(COOLDOWN_KEY);
    if (lastShown && Date.now() - parseInt(lastShown) < COOLDOWN_HOURS * 3600_000) return false;
    return true;
  }, []);

  const show = useCallback(() => {
    if (!shouldShow()) return;
    setOpen(true);
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  }, [shouldShow]);

  // Trigger 1: Exit intent (mouse leaves viewport top)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.clientY <= 5 && !open) show();
    };
    document.addEventListener("mouseleave", handler);
    return () => document.removeEventListener("mouseleave", handler);
  }, [open, show]);

  // Trigger 2: Time on page delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open) show();
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, show]);

  const handleClaim = () => {
    setOpen(false);
    navigate("/auth?offer=insane&utm_source=exit_popup");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-[hsl(222,47%,6%)] shadow-2xl shadow-primary/20"
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Top banner */}
            <div className="bg-gradient-to-r from-primary to-[hsl(250,83%,55%)] px-6 py-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Gift className="h-5 w-5 text-white" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/90">Oferta Exclusiva</span>
              </div>
              <p className="text-2xl font-black text-white">ESPERE! 🎁</p>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-5 text-center">
              <div>
                <h3 className="text-xl font-bold text-[hsl(210,40%,98%)] mb-2">
                  Antes de ir, temos algo especial para si
                </h3>
                <p className="text-sm text-[hsl(210,40%,98%)]/60 leading-relaxed">
                  Registe-se agora e receba <strong className="text-primary">30 dias grátis</strong> do plano Growth + <strong className="text-primary">1.000 créditos IA</strong> de bónus.
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 text-left">
                {[
                  { icon: Zap, text: "Plano Growth completo durante 30 dias" },
                  { icon: Gift, text: "1.000 créditos IA de bónus (valor: 49€)" },
                  { icon: Clock, text: "Setup assistido gratuito por especialista" },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-[hsl(210,40%,98%)]/80">{text}</span>
                  </div>
                ))}
              </div>

              {/* Urgency */}
              <div className="flex items-center justify-center gap-2 text-xs text-[hsl(210,40%,98%)]/40">
                <Clock className="h-3.5 w-3.5" />
                <span>Oferta válida apenas nas próximas 24 horas</span>
              </div>

              {/* CTA */}
              <Button
                onClick={handleClaim}
                size="lg"
                className="w-full h-14 gradient-primary shadow-glow text-primary-foreground text-base font-bold uppercase tracking-wide gap-2"
              >
                Quero Esta Oferta
                <ArrowRight className="h-4 w-4" />
              </Button>

              <button
                onClick={() => setOpen(false)}
                className="text-xs text-[hsl(210,40%,98%)]/30 hover:text-[hsl(210,40%,98%)]/50 transition underline"
              >
                Não, obrigado
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
