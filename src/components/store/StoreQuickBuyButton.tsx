import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useStoreCart } from "@/contexts/StoreCartContext";

interface StoreQuickBuyButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    image?: string;
    sku?: string;
  };
  workspaceSlug: string;
  disabled?: boolean;
  quantity?: number;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** Compact mode for product cards */
  compact?: boolean;
}

export function StoreQuickBuyButton({
  product,
  workspaceSlug,
  disabled,
  quantity = 1,
  variant = "outline",
  size = "lg",
  className,
  compact = false,
}: StoreQuickBuyButtonProps) {
  const { addItem } = useStoreCart();
  const navigate = useNavigate();

  const handleBuyNow = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (disabled) return;

    addItem(
      {
        productId: product.id,
        name: product.name,
        price: product.price,
        currency: product.currency,
        image: product.image,
        sku: product.sku,
      },
      quantity
    );
    navigate(`/store/${workspaceSlug}/checkout`);
  };

  if (compact) {
    return (
      <Button
        size="icon"
        variant="secondary"
        className="h-9 w-9 rounded-full shadow-lg backdrop-blur-sm bg-background/80 hover:bg-primary hover:text-primary-foreground transition-all duration-200 active:scale-90"
        onClick={handleBuyNow}
        disabled={disabled}
        title="Comprar Agora"
      >
        <Zap className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 rounded-xl transition-transform duration-200 active:scale-[0.98] ${className || ""}`}
      onClick={handleBuyNow}
      disabled={disabled}
    >
      <Zap className="h-5 w-5" />
      Comprar Agora
    </Button>
  );
}
