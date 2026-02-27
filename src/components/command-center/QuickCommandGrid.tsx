import { SLASH_COMMANDS, SlashCommand } from "@/hooks/useSlashCommands";
import { cn } from "@/lib/utils";
import { BarChart3, Target, Users, TrendingUp, CheckSquare, FileText } from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ElementType> = {
  BarChart3, Target, Users, TrendingUp, CheckSquare, FileText,
};

const categoryColors: Record<string, string> = {
  pipeline: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
  leads: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
  revenue: "from-primary/20 to-primary/5 border-primary/20",
  actions: "from-violet-500/20 to-violet-600/5 border-violet-500/20",
};

interface Props {
  onSelect: (cmd: SlashCommand) => void;
}

export function QuickCommandGrid({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {SLASH_COMMANDS.map((cmd, idx) => {
        const Icon = iconMap[cmd.icon] || Target;
        return (
          <motion.button
            key={cmd.id}
            onClick={() => onSelect(cmd)}
            className={cn(
              "group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
              "bg-gradient-to-br hover:scale-[1.02] active:scale-[0.98]",
              categoryColors[cmd.category] || "border-border/50"
            )}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.2 }}
          >
            <Icon className="h-5 w-5 text-foreground/70 group-hover:text-primary transition-colors" />
            <div>
              <p className="text-sm font-medium text-foreground">{cmd.label}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{cmd.description}</p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60">{cmd.command}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
