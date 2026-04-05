import { Users, Search, Mail, MessageSquare, Calendar, Trophy, XCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface PipelineStage {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface SDRPipelineViewProps {
  stats: {
    enrolled: number;
    enriching: number;
    sequenced: number;
    replied: number;
    meetingSet: number;
    converted: number;
    optedOut: number;
    total: number;
  };
}

export function SDRPipelineView({ stats }: SDRPipelineViewProps) {
  const stages: PipelineStage[] = [
    { label: "Prospectados", count: stats.enrolled, icon: <Users className="h-5 w-5" />, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Enriquecidos", count: stats.enriching, icon: <Search className="h-5 w-5" />, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    { label: "Em Sequência", count: stats.sequenced, icon: <Mail className="h-5 w-5" />, color: "text-violet-500", bgColor: "bg-violet-500/10" },
    { label: "Responderam", count: stats.replied, icon: <MessageSquare className="h-5 w-5" />, color: "text-amber-500", bgColor: "bg-amber-500/10" },
    { label: "Reunião", count: stats.meetingSet, icon: <Calendar className="h-5 w-5" />, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { label: "Convertidos", count: stats.converted, icon: <Trophy className="h-5 w-5" />, color: "text-green-600", bgColor: "bg-green-600/10" },
  ];

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline SDR</h3>
      <div className="flex items-stretch gap-1">
        {stages.map((stage, i) => {
          const pct = Math.round((stage.count / maxCount) * 100);
          return (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="flex-1 relative group"
            >
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                <div className={`p-2.5 rounded-xl ${bgColor(stage)}`}>
                  <span className={stage.color}>{stage.icon}</span>
                </div>
                <motion.span
                  className="text-2xl font-bold text-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 + 0.2 }}
                >
                  {stage.count}
                </motion.span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight font-medium">
                  {stage.label}
                </span>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                  <motion.div
                    className={`h-1.5 rounded-full ${barColor(stage)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: i * 0.08 + 0.3, duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="absolute top-1/2 -right-2.5 z-10 text-muted-foreground/30 hidden md:block">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      {stats.optedOut > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <XCircle className="h-3 w-3" />
          <span>{stats.optedOut} opt-outs</span>
        </div>
      )}
    </div>
  );
}

function bgColor(stage: PipelineStage) {
  return stage.bgColor;
}

function barColor(stage: PipelineStage) {
  // Map text color to bg equivalent
  const map: Record<string, string> = {
    "text-blue-500": "bg-blue-500",
    "text-indigo-500": "bg-indigo-500",
    "text-violet-500": "bg-violet-500",
    "text-amber-500": "bg-amber-500",
    "text-emerald-500": "bg-emerald-500",
    "text-green-600": "bg-green-600",
  };
  return map[stage.color] || "bg-primary";
}
