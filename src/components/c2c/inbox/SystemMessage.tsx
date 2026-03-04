import { HandCoins, CheckCircle, XCircle, Lock, ShoppingBag, RefreshCw, Info } from "lucide-react";
import type { C2CMessage } from "@/hooks/useC2CMessages";

interface SystemMessageProps {
  message: C2CMessage;
}

export function SystemMessage({ message }: SystemMessageProps) {
  const meta = (message.metadata || {}) as Record<string, unknown>;
  const offerStatus = meta.offer_status as string | undefined;
  const listingStatus = meta.listing_status as string | undefined;
  const offerPrice = meta.offer_price as number | undefined;

  let icon = <Info className="h-4 w-4" />;
  let accentClass = "text-muted-foreground";

  if (message.message_type === "offer") {
    icon = <HandCoins className="h-4 w-4" />;
    accentClass = "text-[hsl(43,96%,56%)]";
  } else if (offerStatus === "accepted") {
    icon = <CheckCircle className="h-4 w-4" />;
    accentClass = "text-[hsl(142,76%,36%)]";
  } else if (offerStatus === "rejected") {
    icon = <XCircle className="h-4 w-4" />;
    accentClass = "text-destructive";
  } else if (offerStatus === "countered") {
    icon = <RefreshCw className="h-4 w-4" />;
    accentClass = "text-[hsl(43,96%,56%)]";
  } else if (listingStatus === "reserved") {
    icon = <Lock className="h-4 w-4" />;
    accentClass = "text-[hsl(38,92%,50%)]";
  } else if (listingStatus === "sold") {
    icon = <ShoppingBag className="h-4 w-4" />;
    accentClass = "text-[hsl(142,76%,36%)]";
  }

  return (
    <div className="flex justify-center my-3">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 max-w-[80%]">
        <span className={accentClass}>{icon}</span>
        <span className="text-xs text-muted-foreground">
          {message.content}
          {offerPrice && message.message_type === "offer" && (
            <span className="font-semibold text-[hsl(43,96%,56%)] ml-1">
              {offerPrice.toFixed(2)} €
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
