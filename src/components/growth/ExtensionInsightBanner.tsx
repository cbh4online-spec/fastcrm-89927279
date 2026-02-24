import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Lightbulb, ArrowRight } from "lucide-react";

interface ExtensionInsightBannerProps {
  /** Number of deals in proposal stage */
  proposalDeals?: number;
  /** Whether proposals pack is installed */
  hasProposalsPack?: boolean;
  /** Whether there are overdue invoices */
  hasOverdueInvoices?: boolean;
  /** Whether finance pack is installed */
  hasFinancePack?: boolean;
  /** Callback when user clicks activate */
  onActivate?: (packId: string) => void;
}

export function ExtensionInsightBanner({
  proposalDeals = 0,
  hasProposalsPack = false,
  hasOverdueInvoices = false,
  hasFinancePack = false,
  onActivate,
}: ExtensionInsightBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const storageKey = "extension-insight-dismissed";

  useEffect(() => {
    const dismissedAt = localStorage.getItem(storageKey);
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  // Determine which insight to show
  let message: string | null = null;
  let packId: string | null = null;
  let packName: string | null = null;

  if (proposalDeals >= 3 && !hasProposalsPack) {
    message = `${proposalDeals} deals in Proposal stage. Activate Proposals Pack to create proposals directly.`;
    packId = "proposals";
    packName = "Proposals Pack";
  } else if (hasOverdueInvoices && !hasFinancePack) {
    message = "You have overdue payments. Activate Finance Pack for automated alerts.";
    packId = "finance";
    packName = "Finance Pack";
  }

  if (!message || !packId) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div className="relative flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
      <div className="p-2 rounded-lg bg-amber-500/10">
        <Lightbulb className="w-5 h-5 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Extension Insight</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      {onActivate && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onActivate(packId!)}
          className="gap-1 shrink-0 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
        >
          Activate {packName}
          <ArrowRight className="w-3 h-3" />
        </Button>
      )}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted/50 text-muted-foreground"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
