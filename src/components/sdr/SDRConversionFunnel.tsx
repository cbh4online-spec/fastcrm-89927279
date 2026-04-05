import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { SDRPipelineStage } from "@/hooks/useSDRPipelineStages";

interface SDRConversionFunnelProps {
  stages: SDRPipelineStage[];
  counts: Record<string, number>;
}

export const SDRConversionFunnel = memo(function SDRConversionFunnel({
  stages,
  counts,
}: SDRConversionFunnelProps) {
  const funnelStages = stages.filter((s) => !s.is_negative);
  const maxCount = Math.max(...funnelStages.map((s) => counts[s.key] || 0), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        {funnelStages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem fases configuradas.</p>
        ) : (
          <div className="space-y-2">
            {funnelStages.map((stage, i) => {
              const count = counts[stage.key] || 0;
              const prevCount = i > 0 ? counts[funnelStages[i - 1].key] || 0 : 0;
              const widthPct = maxCount > 0 ? Math.max(8, (count / maxCount) * 100) : 8;
              const dropOff = i > 0 && prevCount > 0 ? ((1 - count / prevCount) * 100).toFixed(0) : null;
              const passRate = i > 0 && prevCount > 0 ? ((count / prevCount) * 100).toFixed(0) : null;

              return (
                <div key={stage.key}>
                  {i > 0 && dropOff && (
                    <div className="flex items-center justify-center gap-2 py-1 text-[11px] text-muted-foreground">
                      <span className="text-destructive font-medium">↓ {dropOff}% drop</span>
                      <span>·</span>
                      <span className="text-emerald-600 font-medium">{passRate}% passaram</span>
                    </div>
                  )}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
                    className={`mx-auto rounded-lg px-3 py-2.5 flex items-center justify-between bg-${stage.color}/15 border border-${stage.color}/20`}
                    style={{
                      width: `${widthPct}%`,
                      minWidth: "120px",
                      backgroundColor: `rgb(var(--${stage.color}, 100 100 100) / 0.1)`,
                    }}
                  >
                    <span className="text-xs font-medium truncate">{stage.label}</span>
                    <span className="text-sm font-bold ml-2">{count}</span>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
