import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, Target, Upload, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface WelcomeOverlayProps {
  segment: string | null;
  bundleActivated: string | null;
  onDismiss: () => void;
}

const SEGMENT_INSIGHTS: Record<string, { title: string; tip: string; action: string; actionRoute: string }> = {
  startup_saas: {
    title: "O teu CRM SaaS está pronto!",
    tip: "Começa por criar o teu primeiro deal para ver o pipeline em ação.",
    action: "Criar primeiro deal",
    actionRoute: "/dashboard",
  },
  smb_traditional: {
    title: "O teu CRM está configurado!",
    tip: "Importa os teus contactos existentes para começar a gerir o pipeline.",
    action: "Importar contactos",
    actionRoute: "/contacts",
  },
  b2b_complex: {
    title: "Pipeline B2B ativo!",
    tip: "Começa por adicionar as empresas-alvo para construir o teu pipeline B2B.",
    action: "Adicionar empresa",
    actionRoute: "/companies",
  },
  generic: {
    title: "Tudo pronto!",
    tip: "Explora o dashboard e começa a adicionar leads ao teu pipeline.",
    action: "Explorar",
    actionRoute: "/dashboard",
  },
};

export function WelcomeOverlay({ segment, bundleActivated, onDismiss }: WelcomeOverlayProps) {
  const navigate = useNavigate();
  const insight = SEGMENT_INSIGHTS[segment || "generic"] || SEGMENT_INSIGHTS.generic;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{insight.title}</h3>
              <p className="text-sm text-muted-foreground">{insight.tip}</p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              onDismiss();
              navigate(insight.actionRoute);
            }}
            className="gap-1.5"
          >
            {insight.action}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>

          {bundleActivated && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              Bundle ativo
            </Badge>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
