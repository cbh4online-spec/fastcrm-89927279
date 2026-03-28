import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SLATimerProps {
  deadline: string;
  className?: string;
}

export function SLATimer({ deadline, className }: SLATimerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const deadlineMs = new Date(deadline).getTime();
  const diff = deadlineMs - now;
  const isExpired = diff <= 0;

  if (isExpired) {
    return (
      <Badge variant="destructive" className={cn("gap-1", className)}>
        <AlertTriangle className="h-3 w-3" />
        SLA Expirado
      </Badge>
    );
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  // Calculate percentage of original SLA remaining (approximate using 24h as baseline)
  const pct = Math.min(100, (diff / (24 * 60 * 60 * 1000)) * 100);
  const colorClass = pct > 50
    ? "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400"
    : pct > 20
      ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400"
      : "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";

  return (
    <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium", colorClass, className)}>
      <Clock className="h-3 w-3" />
      <span className="font-mono">
        {String(hours).padStart(2, "0")}:{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}
