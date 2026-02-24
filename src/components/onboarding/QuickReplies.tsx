import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface QuickReplyOption {
  label: string;
  value: string;
  icon?: string;
  description?: string;
}

interface QuickRepliesProps {
  options: QuickReplyOption[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  selected?: string[];
  columns?: 2 | 3;
}

export function QuickReplies({ options, onSelect, multiSelect, selected = [], columns = 2 }: QuickRepliesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        "grid gap-2 pl-11",
        columns === 3 ? "grid-cols-3" : "grid-cols-2"
      )}
    >
      {options.map((option, i) => {
        const isSelected = selected.includes(option.value);
        return (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i }}
            onClick={() => onSelect(option.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left text-sm transition-all hover:border-primary hover:bg-primary/5",
              isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border bg-card"
            )}
          >
            {option.icon && <span className="text-lg">{option.icon}</span>}
            <span className="font-medium text-foreground">{option.label}</span>
            {option.description && (
              <span className="text-xs text-muted-foreground">{option.description}</span>
            )}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
