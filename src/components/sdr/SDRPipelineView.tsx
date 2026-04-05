import { Users, Search, Mail, MessageSquare, Calendar, Trophy, XCircle } from "lucide-react";

interface PipelineStage {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
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
    { label: "Prospectados", count: stats.enrolled, icon: <Users className="h-4 w-4" />, color: "bg-blue-500" },
    { label: "Enriquecidos", count: stats.enriching, icon: <Search className="h-4 w-4" />, color: "bg-indigo-500" },
    { label: "Em Sequência", count: stats.sequenced, icon: <Mail className="h-4 w-4" />, color: "bg-violet-500" },
    { label: "Responderam", count: stats.replied, icon: <MessageSquare className="h-4 w-4" />, color: "bg-amber-500" },
    { label: "Reunião", count: stats.meetingSet, icon: <Calendar className="h-4 w-4" />, color: "bg-emerald-500" },
    { label: "Convertidos", count: stats.converted, icon: <Trophy className="h-4 w-4" />, color: "bg-green-600" },
  ];

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline SDR</h3>
      <div className="grid grid-cols-6 gap-2">
        {stages.map((stage, i) => {
          const pct = Math.round((stage.count / maxCount) * 100);
          return (
            <div key={stage.label} className="relative group">
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className={`p-2 rounded-full ${stage.color} text-white`}>
                  {stage.icon}
                </div>
                <span className="text-2xl font-bold text-foreground">{stage.count}</span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">{stage.label}</span>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div className={`h-1.5 rounded-full ${stage.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="absolute top-1/2 -right-2 text-muted-foreground/40 text-lg hidden lg:block">→</div>
              )}
            </div>
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
