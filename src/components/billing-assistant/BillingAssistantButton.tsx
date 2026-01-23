import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { BillingAssistantDrawer } from "./BillingAssistantDrawer";
import { cn } from "@/lib/utils";

interface BillingAssistantButtonProps {
  opportunityId?: string;
  subscriptionId?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function BillingAssistantButton({
  opportunityId,
  subscriptionId,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true
}: BillingAssistantButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn("gap-2", className)}
      >
        <Bot className="h-4 w-4" />
        {showLabel && "Assistente IA"}
      </Button>

      <BillingAssistantDrawer
        open={open}
        onOpenChange={setOpen}
        opportunityId={opportunityId}
        subscriptionId={subscriptionId}
      />
    </>
  );
}
