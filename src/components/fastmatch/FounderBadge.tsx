import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export function FounderBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700 text-[10px] font-semibold ${className || ""}`}
    >
      <Shield className="w-3 h-3" />
      Membro Fundador
    </Badge>
  );
}
