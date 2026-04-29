import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, HelpCircle, AlertTriangle } from "lucide-react";
import type { ConfidenceLevel } from "./types";
import { cn } from "@/lib/utils";

const map: Record<ConfidenceLevel, { label: string; cls: string; Icon: typeof Check }> = {
  high: { label: "Alta confiança", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: Check },
  medium: { label: "Média", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: AlertCircle },
  low: { label: "Baixa", cls: "bg-orange-500/10 text-orange-600 border-orange-500/30", Icon: AlertTriangle },
  pending_validation: { label: "Pendente", cls: "bg-muted text-muted-foreground border-border", Icon: HelpCircle },
};

export function ConfidenceBadge({ level, className }: { level?: ConfidenceLevel; className?: string }) {
  const cfg = map[level ?? "pending_validation"];
  const Icon = cfg.Icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10px] py-0 h-5", cfg.cls, className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

export function OriginBadge({ origin }: { origin: "document" | "ai_suggestion" | "pending" }) {
  const cfg = {
    document: { label: "Extraído do documento", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
    ai_suggestion: { label: "Sugestão IA", cls: "bg-violet-500/10 text-violet-600 border-violet-500/30" },
    pending: { label: "Pendente de validação", cls: "bg-muted text-muted-foreground" },
  }[origin];
  return <Badge variant="outline" className={cn("text-[10px] py-0 h-5", cfg.cls)}>{cfg.label}</Badge>;
}
