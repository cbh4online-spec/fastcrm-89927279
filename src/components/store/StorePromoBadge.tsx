import { Badge } from "@/components/ui/badge";
import { Flame, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface StorePromoBadgeProps {
  promoLabel?: string | null;
  promoEndAt?: string | null;
  savingsPercent: number;
  lowestPrice30d: number;
  compact?: boolean;
}

function useCountdown(endDate: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!endDate) return;

    const update = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m`);
      } else {
        setTimeLeft(`${mins}m`);
      }
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
}

export function StorePromoBadge({ promoLabel, promoEndAt, savingsPercent, lowestPrice30d, compact = false }: StorePromoBadgeProps) {
  const countdown = useCountdown(promoEndAt);
  const label = promoLabel || "Promoção";

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <Badge className="text-[10px] px-1.5 py-0 bg-destructive/90 text-destructive-foreground border-0 gap-1 shadow-md">
          <Flame className="h-2.5 w-2.5" />
          -{savingsPercent}% {label}
        </Badge>
        {countdown && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-background/90 backdrop-blur-sm shadow-sm gap-1">
            <Clock className="h-2.5 w-2.5" />
            {countdown}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-destructive/90 text-destructive-foreground border-0 gap-1">
          <Flame className="h-3 w-3" />
          -{savingsPercent}% {label}
        </Badge>
        {countdown && (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Termina em {countdown}
          </Badge>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Preço mais baixo nos últimos 30 dias: €{lowestPrice30d.toFixed(2)}
        <span className="ml-1 opacity-70">(Diretiva Omnibus)</span>
      </p>
    </div>
  );
}
