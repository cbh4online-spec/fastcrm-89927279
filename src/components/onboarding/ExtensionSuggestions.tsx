import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, ArrowRight, Package } from "lucide-react";
import { ExtensionPack, getRecommendedPacks, canInstallPack, PlanTier } from "@/config/extensionPacks";

interface ExtensionSuggestionsProps {
  businessType: string;
  currentPlan?: PlanTier;
  onInstall: (pack: ExtensionPack) => void;
  onSkip: () => void;
}

export function ExtensionSuggestions({
  businessType,
  currentPlan = "free",
  onInstall,
  onSkip,
}: ExtensionSuggestionsProps) {
  const packs = getRecommendedPacks(businessType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Package className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">
          Extensões recomendadas
        </h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Baseado no teu tipo de negócio, estas extensões podem ajudar-te a crescer.
        </p>
      </div>

      <div className="grid gap-3 max-w-lg mx-auto">
        {packs.map((pack, i) => {
          const canInstall = canInstallPack(pack, currentPlan);
          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
            >
              <span className="text-2xl">{pack.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{pack.name}</p>
                <p className="text-xs text-muted-foreground">{pack.description}</p>
              </div>
              {canInstall ? (
                <Button size="sm" variant="outline" onClick={() => onInstall(pack)}>
                  Instalar
                </Button>
              ) : (
                <Button size="sm" variant="ghost" disabled className="gap-1 text-xs">
                  <Lock className="w-3 h-3" />
                  {pack.requiredPlan}+
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <Button onClick={onSkip} variant="ghost" className="gap-2">
          Continuar para o Dashboard
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
