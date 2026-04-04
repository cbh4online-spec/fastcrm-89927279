import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame } from "lucide-react";

interface StoreOfferCountdownProps {
  endsAt: string; // ISO date string
  label?: string;
}

export function StoreOfferCountdown({ endsAt, label = "Oferta termina em" }: StoreOfferCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = calculateTimeLeft(endsAt);
      setTimeLeft(left);
      if (left.total <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (timeLeft.total <= 0) return null;

  const isUrgent = timeLeft.total < 3600000; // < 1 hour

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2.5 rounded-xl p-3 ${
        isUrgent
          ? "bg-destructive/10 border border-destructive/20"
          : "bg-primary/5 border border-primary/20"
      }`}
    >
      <div className={`flex-shrink-0 ${isUrgent ? "text-destructive" : "text-primary"}`}>
        {isUrgent ? (
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <Flame className="h-5 w-5" />
          </motion.div>
        ) : (
          <Clock className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${isUrgent ? "text-destructive" : "text-primary"}`}>
          {label}
        </p>
        <div className="flex items-baseline gap-1 mt-0.5">
          {timeLeft.days > 0 && (
            <TimeUnit value={timeLeft.days} unit="d" urgent={isUrgent} />
          )}
          <TimeUnit value={timeLeft.hours} unit="h" urgent={isUrgent} />
          <span className={`text-xs ${isUrgent ? "text-destructive/60" : "text-primary/60"}`}>:</span>
          <TimeUnit value={timeLeft.minutes} unit="m" urgent={isUrgent} />
          <span className={`text-xs ${isUrgent ? "text-destructive/60" : "text-primary/60"}`}>:</span>
          <TimeUnit value={timeLeft.seconds} unit="s" urgent={isUrgent} />
        </div>
      </div>
    </motion.div>
  );
}

function TimeUnit({ value, unit, urgent }: { value: number; unit: string; urgent: boolean }) {
  return (
    <span className={`font-mono text-lg font-bold ${urgent ? "text-destructive" : "text-primary"}`}>
      {String(value).padStart(2, "0")}
      <span className="text-[10px] font-normal ml-0.5">{unit}</span>
    </span>
  );
}

function calculateTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}
