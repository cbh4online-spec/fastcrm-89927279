import { SLASH_COMMANDS, SlashCommand } from "@/hooks/useSlashCommands";
import { cn } from "@/lib/utils";
import { BarChart3, Target, Users, TrendingUp, CheckSquare, FileText, AlertTriangle, Brain } from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ElementType> = {
  BarChart3, Target, Users, TrendingUp, CheckSquare, FileText, AlertTriangle, Brain,
};

const categoryColors: Record<string, string> = {
  strategy: "from-primary/20 to-primary/5 border-primary/20",
  pipeline: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
  leads: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
  revenue: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
  actions: "from-violet-500/20 to-violet-600/5 border-violet-500/20",
  intelligence: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20",
};

const categoryLabels: Record<string, string> = {
  strategy: "🧠 Estratégia",
  intelligence: "🔮 Inteligência",
  pipeline: "📊 Pipeline",
  revenue: "💰 Revenue",
  leads: "👥 Leads",
  actions: "⚡ Ações",
};

interface Props {
  onSelect: (cmd: SlashCommand) => void;
}

// Filter out legacy commands and group by category
const VISIBLE_COMMANDS = SLASH_COMMANDS.filter(cmd => 
  !["resumir-pipeline", "prioridades", "analisar-lead", "prever-receita", "criar-followup", "gerar-proposta"].includes(cmd.id)
);

export function QuickCommandGrid({ onSelect }: Props) {
  const grouped = VISIBLE_COMMANDS.reduce<Record<string, SlashCommand[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const categoryOrder = ["strategy", "intelligence", "pipeline", "revenue", "leads", "actions"];

  return (
    <div className="space-y-4">
      {categoryOrder.map((cat) => {
        const commands = grouped[cat];
        if (!commands?.length) return null;
        return (
          <div key={cat} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {categoryLabels[cat] || cat}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {commands.map((cmd, idx) => {
                const Icon = iconMap[cmd.icon] || Target;
                return (
                  <motion.button
                    key={cmd.id}
                    onClick={() => onSelect(cmd)}
                    className={cn(
                      "group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                      "bg-gradient-to-br hover:scale-[1.02] active:scale-[0.98]",
                      categoryColors[cmd.category] || "border-border/50"
                    )}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.2 }}
                  >
                    <Icon className="h-4 w-4 text-foreground/70 group-hover:text-primary transition-colors" />
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">{cmd.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{cmd.description}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/50">{cmd.command}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
