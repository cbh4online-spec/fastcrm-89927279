import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700 text-[10px] font-semibold ${className || ""}`}
    >
      <CheckCircle2 className="w-3 h-3" />
      Cliente FastCRM Verificado
    </Badge>
  );
}
