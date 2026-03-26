import { useEnrichmentProcessor } from "@/contexts/EnrichmentProcessorContext";
import { Progress } from "@/components/ui/progress";
import { Sparkles, X, Square } from "lucide-react";
import { useLocation } from "react-router-dom";

export function EnrichmentFloatingIndicator() {
  const { batchProgress, isBatchRunning, requestStop } = useEnrichmentProcessor();
  const location = useLocation();

  // Don't show floating indicator if we're already on the enricher page
  const isOnEnricherPage = location.pathname === "/dashboard/lead-enricher";

  if (!batchProgress || !isBatchRunning || isOnEnricherPage) return null;

  const pct = Math.round((batchProgress.done / batchProgress.total) * 100);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-card shadow-lg p-4 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          Enriquecimento em curso
        </div>
        <button
          onClick={requestStop}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Parar processamento"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-2 truncate">
        {batchProgress.current || "A processar..."}
      </p>
      <Progress value={pct} className="h-1.5" />
      <p className="text-xs text-muted-foreground mt-1 text-right">
        {batchProgress.done}/{batchProgress.total}
      </p>
    </div>
  );
}
