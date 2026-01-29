import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type DeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed";

interface MessageDeliveryStatusProps {
  status: DeliveryStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<DeliveryStatus, {
  icon: typeof Check;
  label: string;
  colorClass: string;
}> = {
  pending: {
    icon: Clock,
    label: "A enviar...",
    colorClass: "text-muted-foreground animate-pulse",
  },
  sent: {
    icon: Check,
    label: "Enviado",
    colorClass: "text-muted-foreground",
  },
  delivered: {
    icon: CheckCheck,
    label: "Entregue",
    colorClass: "text-muted-foreground",
  },
  read: {
    icon: CheckCheck,
    label: "Lido",
    colorClass: "text-green-500",
  },
  failed: {
    icon: Check,
    label: "Falhou",
    colorClass: "text-destructive",
  },
};

export function MessageDeliveryStatus({ 
  status, 
  className,
  showLabel = false 
}: MessageDeliveryStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1", className)}>
            <Icon className={cn("w-3.5 h-3.5", config.colorClass)} />
            {showLabel && (
              <span className={cn("text-[10px]", config.colorClass)}>
                {config.label}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          {config.label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Determines the delivery status from message properties
 */
export function getDeliveryStatus(message: {
  read_at?: string | null;
  delivered_at?: string | null;
  sent_at?: string | null;
  created_at?: string;
  channel_metadata?: Record<string, any>;
  status?: string;
}): DeliveryStatus {
  // Check for explicit failed status
  if (message.status === "failed") {
    return "failed";
  }

  // Check for read status
  if (message.read_at) {
    return "read";
  }

  // Check for delivered status (direct field or in channel_metadata)
  if (message.delivered_at || message.channel_metadata?.delivered_at) {
    return "delivered";
  }

  // Check if message was sent
  if (message.sent_at || message.channel_metadata?.sent_at || message.created_at) {
    return "sent";
  }

  // Default to pending
  return "pending";
}
