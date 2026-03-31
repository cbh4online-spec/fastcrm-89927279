import { CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

interface EbookStatusBarProps {
  chaptersCount: number;
  totalWords: number;
  progress: number;
  saveStatus: SaveStatus;
  lastSavedAt?: Date | null;
  isDirty?: boolean;
}

export function EbookStatusBar({ chaptersCount, totalWords, progress, saveStatus, lastSavedAt, isDirty }: EbookStatusBarProps) {
  const statusConfig = {
    idle: { icon: Clock, text: "Pronto", className: "text-muted-foreground" },
    saving: { icon: Loader2, text: "A guardar…", className: "text-amber-500" },
    saved: { icon: CheckCircle2, text: "Guardado", className: "text-emerald-500/80" },
    failed: { icon: AlertCircle, text: "Erro ao guardar", className: "text-destructive" },
  };

  const { icon: StatusIcon, text: statusText, className: statusClassName } = statusConfig[saveStatus];

  return (
    <div className="shrink-0 border-t border-border/40 bg-card/60 backdrop-blur px-4 py-1.5 flex items-center gap-4 text-xs text-muted-foreground">
      <span>{chaptersCount} capítulo{chaptersCount !== 1 ? "s" : ""}</span>
      <span className="text-border">·</span>
      <span>{totalWords.toLocaleString()} palavras</span>
      <span className="text-border">·</span>
      <span>{Math.round(progress)}% concluído</span>
      {isDirty && (
        <>
          <span className="text-border">·</span>
          <span className="text-amber-500/80">Alterações por guardar</span>
        </>
      )}
      <span className="flex-1" />
      <span className={cn("flex items-center gap-1", statusClassName)}>
        <StatusIcon className={cn("h-3 w-3", saveStatus === 'saving' && "animate-spin")} />
        {statusText}
      </span>
      {lastSavedAt && saveStatus === 'saved' && (
        <span className="text-muted-foreground/50">
          {lastSavedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
