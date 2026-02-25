import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface WelcomeOverlayProps {
  segment: string | null;
  bundleActivated: string | null;
  onDismiss: () => void;
}

const SEGMENT_KEYS: Record<string, { titleKey: string; tipKey: string; actionKey: string; actionRoute: string }> = {
  startup_saas: {
    titleKey: "welcomeStartupTitle",
    tipKey: "welcomeStartupTip",
    actionKey: "welcomeStartupAction",
    actionRoute: "/dashboard",
  },
  smb_traditional: {
    titleKey: "welcomeSMBTitle",
    tipKey: "welcomeSMBTip",
    actionKey: "welcomeSMBAction",
    actionRoute: "/contacts",
  },
  b2b_complex: {
    titleKey: "welcomeB2BTitle",
    tipKey: "welcomeB2BTip",
    actionKey: "welcomeB2BAction",
    actionRoute: "/companies",
  },
  generic: {
    titleKey: "welcomeGenericTitle",
    tipKey: "welcomeGenericTip",
    actionKey: "welcomeGenericAction",
    actionRoute: "/dashboard",
  },
};

export function WelcomeOverlay({ segment, bundleActivated, onDismiss }: WelcomeOverlayProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const segmentConfig = SEGMENT_KEYS[segment || "generic"] || SEGMENT_KEYS.generic;

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
              <h3 className="font-semibold text-foreground">{t(segmentConfig.titleKey)}</h3>
              <p className="text-sm text-muted-foreground">{t(segmentConfig.tipKey)}</p>
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
              navigate(segmentConfig.actionRoute);
            }}
            className="gap-1.5"
          >
            {t(segmentConfig.actionKey)}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>

          {bundleActivated && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="w-3 h-3" />
              {t('activeBundle')}
            </Badge>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
