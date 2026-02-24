import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface SmartUpgradeBannerProps {
  context: "pipeline" | "intelligence" | "marketplace" | "automations";
}

const MESSAGES: Record<string, { title: string; description: string; plan: "growth" | "scale" }> = {
  pipeline: {
    title: "Need more pipelines?",
    description: "Upgrade to Growth to unlock multi-pipeline and stage benchmarks.",
    plan: "growth",
  },
  intelligence: {
    title: "Unlock Revenue Intelligence",
    description: "Upgrade to Growth for AI suggestions, insights, and stage benchmarks.",
    plan: "growth",
  },
  marketplace: {
    title: "Activate Extensions",
    description: "Upgrade to Growth to install marketplace extensions and bundles.",
    plan: "growth",
  },
  automations: {
    title: "More Automations",
    description: "Upgrade for advanced automation templates and unlimited workflows.",
    plan: "growth",
  },
};

export function SmartUpgradeBanner({ context }: SmartUpgradeBannerProps) {
  const { plan, createCheckout } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  const storageKey = `smart-upgrade-dismissed-${context}`;

  useEffect(() => {
    const dismissedAt = localStorage.getItem(storageKey);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) setDismissed(true);
    }
  }, [storageKey]);

  // Only show for starter plan
  if (plan !== "starter" || dismissed) return null;

  const msg = MESSAGES[context];
  if (!msg) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div className="relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
      <div className="p-2 rounded-lg bg-primary/10">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{msg.title}</p>
        <p className="text-xs text-muted-foreground">{msg.description}</p>
      </div>
      <Button
        size="sm"
        onClick={() => createCheckout(msg.plan)}
        className="gap-1 shrink-0"
      >
        Upgrade
        <ArrowRight className="w-3 h-3" />
      </Button>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 text-muted-foreground"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
