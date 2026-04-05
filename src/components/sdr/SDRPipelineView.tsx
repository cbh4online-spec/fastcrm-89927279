import { Users, Search, Mail, MessageSquare, Calendar, Trophy, XCircle, ChevronRight, Circle } from "lucide-react";
import { motion } from "framer-motion";
import type { SDRPipelineStage } from "@/hooks/useSDRPipelineStages";

// Icon map for dynamic resolution
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users, Search, Mail, MessageSquare, Calendar, Trophy, XCircle, Circle,
};

function getColorValue(color: string): string {
  const map: Record<string, string> = {
    "blue-500": "#3b82f6", "indigo-500": "#6366f1", "violet-500": "#8b5cf6",
    "purple-500": "#a855f7", "amber-500": "#f59e0b", "orange-500": "#f97316",
    "emerald-500": "#10b981", "green-600": "#16a34a", "red-500": "#ef4444",
    "pink-500": "#ec4899", "cyan-500": "#06b6d4", "gray-500": "#6b7280",
  };
  return map[color] || "#6b7280";
}

// Legacy interface for backward compat
interface LegacyStats {
  enrolled: number;
  enriching: number;
  sequenced: number;
  replied: number;
  meetingSet: number;
  converted: number;
  optedOut: number;
  total: number;
}

interface SDRPipelineViewProps {
  stats: LegacyStats;
  /** If provided, uses dynamic stages instead of hardcoded ones */
  dynamicStages?: SDRPipelineStage[];
  /** Override counts per stage key */
  counts?: Record<string, number>;
  onStageClick?: (stageKey: string) => void;
}

export function SDRPipelineView({ stats, dynamicStages, counts, onStageClick }: SDRPipelineViewProps) {
  // If dynamic stages provided, use them; otherwise fallback to legacy
  const resolvedStages = dynamicStages
    ? dynamicStages.filter((s) => !s.is_negative)
    : [
        { key: "enrolled", label: "Prospectados", color: "blue-500", icon: "Users" },
        { key: "enriching", label: "Enriquecidos", color: "indigo-500", icon: "Search" },
        { key: "sequenced", label: "Em Sequência", color: "violet-500", icon: "Mail" },
        { key: "replied", label: "Responderam", color: "amber-500", icon: "MessageSquare" },
        { key: "meeting_set", label: "Reunião", color: "emerald-500", icon: "Calendar" },
        { key: "converted", label: "Convertidos", color: "green-600", icon: "Trophy" },
      ];

  // Legacy stats mapping
  const legacyCounts: Record<string, number> = {
    enrolled: stats.enrolled,
    enriching: stats.enriching,
    sequenced: stats.sequenced,
    replied: stats.replied,
    meeting_set: stats.meetingSet,
    converted: stats.converted,
  };

  const getCounts = (key: string) => counts?.[key] ?? legacyCounts[key] ?? 0;

  const maxCount = Math.max(...resolvedStages.map((s) => getCounts(s.key)), 1);
  const totalFlow = resolvedStages.reduce((sum, s) => sum + getCounts(s.key), 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline SDR</h3>
      <div className="flex items-stretch gap-1">
        {resolvedStages.map((stage, i) => {
          const count = getCounts(stage.key);
          const pct = Math.round((count / maxCount) * 100);
          const colorVal = getColorValue(stage.color);
          const Icon = ICON_MAP[stage.icon] || Circle;
          const prevCount = i > 0 ? getCounts(resolvedStages[i - 1].key) : 0;
          const passRate = i > 0 && prevCount > 0 ? ((count / prevCount) * 100).toFixed(0) : null;

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex-1 relative group"
              onClick={() => onStageClick?.(stage.key)}
              role={onStageClick ? "button" : undefined}
              style={{ cursor: onStageClick ? "pointer" : undefined }}
            >
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                <div
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: `${colorVal}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: colorVal }} />
                </div>
                <motion.span
                  className="text-2xl font-bold text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 + 0.2 }}
                >
                  {count}
                </motion.span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight font-medium">
                  {stage.label}
                </span>
                {passRate && (
                  <span className="text-[10px] text-emerald-600 font-medium">{passRate}%</span>
                )}
                <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                  <motion.div
                    className="h-1.5 rounded-full"
                    style={{ backgroundColor: colorVal }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: i * 0.08 + 0.3, duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
              {i < resolvedStages.length - 1 && (
                <div className="absolute top-1/2 -right-2.5 z-10 text-muted-foreground/30 hidden md:block">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      {/* Negative stages summary */}
      {(stats.optedOut > 0 || (dynamicStages?.some((s) => s.is_negative && getCounts(s.key) > 0))) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {dynamicStages
            ? dynamicStages
                .filter((s) => s.is_negative && getCounts(s.key) > 0)
                .map((s) => (
                  <div key={s.key} className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-destructive" />
                    <span>{getCounts(s.key)} {s.label.toLowerCase()}</span>
                  </div>
                ))
            : stats.optedOut > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  <span>{stats.optedOut} opt-outs</span>
                </div>
              )
          }
        </div>
      )}
    </div>
  );
}
