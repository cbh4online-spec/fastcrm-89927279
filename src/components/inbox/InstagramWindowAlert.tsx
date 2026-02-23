import { useState, useEffect } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { differenceInHours, differenceInMinutes } from "date-fns";
import { Message } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

interface InstagramWindowAlertProps {
  messages: Message[];
  channel: string;
  onExpiredChange?: (expired: boolean) => void;
}

export function InstagramWindowAlert({ messages, channel, onExpiredChange }: InstagramWindowAlertProps) {
  const [now, setNow] = useState(() => new Date());

  // Update every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Find latest inbound message
  const lastInbound = messages
    ?.filter((m) => m.direction === "inbound")
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

  const isInstagram = channel?.toLowerCase() === "instagram";
  const lastInboundDate = lastInbound ? new Date(lastInbound.sent_at) : null;
  const hoursPassed = lastInboundDate ? differenceInHours(now, lastInboundDate) : 0;
  const totalMinutes = lastInboundDate ? differenceInMinutes(now, lastInboundDate) : 0;
  const isExpired = isInstagram && !!lastInboundDate && hoursPassed >= 24;
  const isExpiring = isInstagram && !!lastInboundDate && hoursPassed >= 20 && !isExpired;

  // Notify parent of expired state
  useEffect(() => {
    onExpiredChange?.(isExpired);
  }, [isExpired, onExpiredChange]);

  if (!isInstagram || !lastInbound || (!isExpired && !isExpiring)) return null;

  // Calculate remaining time for expiring state
  const remainingMinutes = 24 * 60 - totalMinutes;
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  return (
    <div
      className={cn(
        "px-4 py-2.5 flex items-center gap-2 text-sm border-b",
        isExpired
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
      )}
    >
      {isExpired ? (
        <>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            Janela de 24h expirada. Não é possível enviar mensagens até o contacto enviar nova mensagem.
          </span>
        </>
      ) : (
        <>
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>
            Janela de resposta expira em {remainingHours}h {remainingMins}min.
          </span>
        </>
      )}
    </div>
  );
}
