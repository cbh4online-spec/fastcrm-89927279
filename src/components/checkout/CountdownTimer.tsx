import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  seconds: number;
  onExpire?: () => void;
  label?: string;
}

export function CountdownTimer({ seconds, onExpire, label = "Oferta expira em" }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (remaining <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-destructive">
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
      <span className="font-mono text-lg font-bold">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
    </div>
  );
}
