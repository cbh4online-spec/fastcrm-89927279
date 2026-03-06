import { useStrategicBriefs } from "@/hooks/useStrategicBriefs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function StrategicBriefCard({ delay = 0 }: { delay?: number }) {
  const { latestBrief, isLoading, isGenerating, generateBrief } = useStrategicBriefs();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <motion.div
        className="rounded-xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000 }}
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-12 w-full" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-4 space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Brief Executivo</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1"
          onClick={generateBrief}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {isGenerating ? "A gerar..." : "Gerar novo"}
        </Button>
      </div>

      {latestBrief ? (
        <div className="space-y-2">
          {latestBrief.summary && (
            <p className="text-xs text-muted-foreground line-clamp-3">{latestBrief.summary}</p>
          )}

          {latestBrief.priority_actions && latestBrief.priority_actions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ações prioritárias</p>
              {latestBrief.priority_actions.slice(0, 2).map((action, i) => (
                <p key={i} className="text-[11px] text-foreground pl-2 border-l-2 border-primary/30 truncate">
                  {action}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(latestBrief.created_at), { addSuffix: true, locale: pt })}
            </span>
            <button
              onClick={() => navigate("/dashboard/strategy")}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
            >
              Ler completo <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground mb-2">Nenhum brief gerado ainda</p>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={generateBrief}
            disabled={isGenerating}
          >
            {isGenerating ? "A gerar..." : "Gerar primeiro brief"}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
