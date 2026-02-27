import { SlashCommand } from "@/hooks/useSlashCommands";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BarChart3, Target, Users, TrendingUp, CheckSquare, FileText } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  BarChart3, Target, Users, TrendingUp, CheckSquare, FileText,
};

interface Props {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (cmd: SlashCommand) => void;
}

export function SlashCommandMenu({ commands, selectedIndex, onSelect }: Props) {
  if (commands.length === 0) return null;

  return (
    <motion.div
      className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
    >
      <div className="px-3 py-2 border-b border-border/30">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Comandos</p>
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {commands.map((cmd, idx) => {
          const Icon = iconMap[cmd.icon] || Target;
          return (
            <button
              key={cmd.id}
              onClick={() => onSelect(cmd)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                idx === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg shrink-0",
                idx === selectedIndex ? "bg-primary/20" : "bg-muted/50"
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{cmd.command}</p>
                <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
