import { AlertTriangle } from "lucide-react";

interface ScarcityIndicatorProps {
  text?: string;
  count?: number;
}

export function ScarcityIndicator({ text, count }: ScarcityIndicatorProps) {
  const display = text || (count ? `Apenas ${count} disponíveis!` : "Stock limitado!");
  
  return (
    <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-amber-600 dark:text-amber-400">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">{display}</span>
    </div>
  );
}
