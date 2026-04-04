import { CreditCard, Smartphone, Building2, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethodType = "stripe_card" | "mbway" | "multibanco" | "bank_transfer";

interface PaymentMethodOption {
  id: PaymentMethodType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const ALL_OPTIONS: PaymentMethodOption[] = [
  { id: "stripe_card", label: "Cartão", description: "Visa, Mastercard, Amex", icon: CreditCard },
  { id: "mbway", label: "MB Way", description: "Pagamento via telemóvel", icon: Smartphone },
  { id: "multibanco", label: "Multibanco", description: "Referência ATM", icon: Building2 },
  { id: "bank_transfer", label: "Transferência", description: "Transferência bancária", icon: Landmark },
];

interface CheckoutPaymentMethodPickerProps {
  enabledMethods: Record<string, boolean>;
  selected: PaymentMethodType;
  onSelect: (method: PaymentMethodType) => void;
}

export function CheckoutPaymentMethodPicker({
  enabledMethods,
  selected,
  onSelect,
}: CheckoutPaymentMethodPickerProps) {
  const available = ALL_OPTIONS.filter((o) => enabledMethods[o.id]);

  if (available.length <= 1) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Método de pagamento</h3>
      <div className="grid grid-cols-2 gap-2">
        {available.map(({ id, label, description, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              selected === id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md",
              selected === id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
