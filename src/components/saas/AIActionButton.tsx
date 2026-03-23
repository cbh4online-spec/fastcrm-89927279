import { useAIGate, CallTier } from "@/hooks/useAIGate";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  tier: CallTier;
  onConfirm: () => void;
  children: ReactNode;
  disabled?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function AIActionButton({ tier, onConfirm, children, disabled, variant, size, className }: Props) {
  const { canRun, isOverage, overageLabel, showUpgrade, overagePrice } = useAIGate(tier);
  const navigate = useNavigate();

  if (showUpgrade) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled={disabled}
        onClick={() => navigate("/dashboard/settings/billing")}
        title="Requer upgrade de plano"
      >
        {children} 🔒
      </Button>
    );
  }

  return (
    <Button
      disabled={disabled || !canRun}
      onClick={onConfirm}
      title={isOverage ? overageLabel : undefined}
      variant={isOverage ? "outline" : (variant ?? "default")}
      size={size}
      className={className}
    >
      {children}
      {isOverage && overagePrice > 0 && (
        <span className="ml-1 text-xs opacity-70">(€{overagePrice.toFixed(2)})</span>
      )}
    </Button>
  );
}
