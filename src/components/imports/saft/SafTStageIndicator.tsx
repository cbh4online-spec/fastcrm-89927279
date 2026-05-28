import { CheckCircle2, Loader2, AlertCircle, Circle, Upload, FileSearch, Eye, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Stage = "queued" | "analyzing" | "preview_ready" | "importing" | "completed" | "failed";

const STAGES: { key: Stage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "queued", label: "Em fila", icon: Upload },
  { key: "analyzing", label: "A analisar", icon: FileSearch },
  { key: "preview_ready", label: "Pré-visualização", icon: Eye },
  { key: "importing", label: "A importar", icon: PlayCircle },
  { key: "completed", label: "Concluído", icon: CheckCircle2 },
];

const ORDER: Stage[] = ["queued", "analyzing", "preview_ready", "importing", "completed"];

function mapStatus(status?: string): Stage {
  if (!status) return "queued";
  if (status === "uploaded") return "queued";
  if (status === "analyzing") return "analyzing";
  if (status === "preview_ready") return "preview_ready";
  if (status === "importing") return "importing";
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "failed";
  return "queued";
}

export function SafTStageIndicator({ status, errorMessage }: { status?: string; errorMessage?: string | null }) {
  const current = mapStatus(status);
  const failed = current === "failed";
  const currentIdx = failed ? -1 : ORDER.indexOf(current);

  return (
    <div className="rounded-lg border bg-card p-4">
      <ol className="flex items-center gap-2 sm:gap-3 overflow-x-auto">
        {STAGES.map((s, idx) => {
          const isDone = !failed && idx < currentIdx;
          const isActive = !failed && idx === currentIdx;
          const isPending = !failed && idx > currentIdx;
          const Icon = isActive ? Loader2 : isDone ? CheckCircle2 : s.icon;

          return (
            <li key={s.key} className="flex items-center gap-2 shrink-0">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isActive && "border-primary bg-primary/10 text-primary",
                  isPending && "border-muted bg-muted/30 text-muted-foreground",
                  failed && "border-muted bg-muted/30 text-muted-foreground",
                )}
                aria-current={isActive ? "step" : undefined}
              >
                <Icon className={cn("h-4 w-4", isActive && "animate-spin")} />
              </div>
              <span
                className={cn(
                  "text-xs sm:text-sm whitespace-nowrap",
                  isActive && "font-semibold text-foreground",
                  isDone && "text-foreground",
                  (isPending || failed) && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              {idx < STAGES.length - 1 && (
                <span
                  className={cn(
                    "hidden sm:block h-px w-6 lg:w-10 transition-colors",
                    isDone ? "bg-primary" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
        {failed && (
          <li className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-destructive whitespace-nowrap">
              Falhou
            </span>
          </li>
        )}
      </ol>
      {failed && errorMessage && (
        <p className="mt-3 text-sm text-destructive flex items-start gap-2">
          <Circle className="h-2 w-2 mt-1.5 fill-current shrink-0" aria-hidden />
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
