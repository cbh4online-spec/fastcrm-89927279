import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { validateQuantity, getNextValidQuantity } from "@/types/product-operations";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  minOrderQuantity?: number;
  orderMultiple?: number;
  packSize?: number;
  disabled?: boolean;
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  minOrderQuantity = 1,
  orderMultiple = 1,
  packSize = 1,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleIncrement = () => {
    const next = getNextValidQuantity(value, minOrderQuantity, orderMultiple, 'up');
    onChange(next);
    setError(null);
  };

  const handleDecrement = () => {
    if (value <= minOrderQuantity) return;
    const next = getNextValidQuantity(value, minOrderQuantity, orderMultiple, 'down');
    onChange(next);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const num = parseInt(newValue, 10);
    if (isNaN(num) || num < 1) {
      setError("Quantidade inválida");
      return;
    }

    const validation = validateQuantity(num, minOrderQuantity, orderMultiple);
    if (!validation.valid) {
      setError(validation.message);
    } else {
      setError(null);
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num < minOrderQuantity) {
      onChange(minOrderQuantity);
      setInputValue(minOrderQuantity.toString());
      setError(null);
      return;
    }

    // Adjust to valid multiple
    if (orderMultiple > 1 && num % orderMultiple !== 0) {
      const adjusted = Math.max(
        Math.round(num / orderMultiple) * orderMultiple,
        minOrderQuantity
      );
      onChange(adjusted);
      setInputValue(adjusted.toString());
      setError(null);
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleDecrement}
          disabled={disabled || value <= minOrderQuantity}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            "h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            error && "border-destructive"
          )}
          min={minOrderQuantity}
          step={orderMultiple}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={handleIncrement}
          disabled={disabled}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      
      {!error && (orderMultiple > 1 || packSize > 1) && (
        <p className="text-xs text-muted-foreground">
          {orderMultiple > 1 && `Múltiplos de ${orderMultiple}`}
          {orderMultiple > 1 && packSize > 1 && " • "}
          {packSize > 1 && `Caixa de ${packSize}`}
        </p>
      )}
    </div>
  );
}
