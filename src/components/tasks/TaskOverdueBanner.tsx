import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface TaskOverdueBannerProps {
  count: number;
  onFocusOverdue: () => void;
}

export function TaskOverdueBanner({ count, onFocusOverdue }: TaskOverdueBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (count === 0 || dismissed) return null;

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <p className="text-sm font-medium flex-1">
        {count === 1
          ? "Tens 1 tarefa atrasada — agir agora"
          : `Tens ${count} tarefas atrasadas — agir agora`}
      </p>
      <Button size="sm" variant="ghost" className="gap-1 text-red-700 dark:text-red-400 hover:bg-red-500/10" onClick={onFocusOverdue}>
        Ver atrasadas
        <ArrowRight className="w-3 h-3" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600/60 hover:bg-red-500/10" onClick={() => setDismissed(true)}>
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
