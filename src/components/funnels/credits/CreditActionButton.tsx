import { useState } from "react";
import { Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreditConfirmDialog } from "./CreditConfirmDialog";
import { useCreditWallet } from "@/hooks/useCreditWallet";

interface Props {
  actionKey: string;
  label: string;
  icon?: React.ReactNode;
  onExecute: () => void | Promise<void>;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  description?: string;
  showCostBadge?: boolean;
}

export function CreditActionButton({
  actionKey, label, icon, onExecute,
  variant = "default", size = "default", className,
  disabled, description, showCostBadge = true,
}: Props) {
  const { getCost, canAfford } = useCreditWallet();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const cost = getCost(actionKey);
  const affordable = canAfford(actionKey);

  const handleConfirm = async () => {
    setIsExecuting(true);
    try {
      await onExecute();
    } finally {
      setIsExecuting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={`gap-2 ${className || ""}`}
              onClick={() => setConfirmOpen(true)}
              disabled={disabled || isExecuting}
            >
              {icon || <Sparkles className="h-4 w-4" />}
              {label}
              {showCostBadge && cost > 0 && (
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 h-5 ${
                    !affordable ? "bg-destructive/20 text-destructive" : ""
                  }`}
                >
                  <Coins className="h-2.5 w-2.5 mr-0.5" />
                  {cost}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta acção consome {cost} crédito{cost !== 1 ? "s" : ""}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CreditConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        actionKey={actionKey}
        onConfirm={handleConfirm}
        isLoading={isExecuting}
        description={description}
      />
    </>
  );
}
