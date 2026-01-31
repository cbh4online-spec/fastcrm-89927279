import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryEstimateProps {
  estimate: string;
  notes?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function DeliveryEstimate({ 
  estimate, 
  notes, 
  className,
  size = "md"
}: DeliveryEstimateProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-muted-foreground",
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}
      title={notes || undefined}
    >
      <Truck className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      <span>Entrega: {estimate}</span>
      {notes && (
        <span className="text-xs opacity-70">({notes})</span>
      )}
    </div>
  );
}
