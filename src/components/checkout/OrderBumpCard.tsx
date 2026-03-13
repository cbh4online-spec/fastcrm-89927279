import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface OrderBumpCardProps {
  offer: {
    id: string;
    name: string;
    headline?: string;
    description?: string;
    price: number;
    compare_at_price?: number;
    currency?: string;
    image_url?: string;
    cta_text?: string;
  };
  onToggle: (offerId: string, accepted: boolean) => void;
}

export function OrderBumpCard({ offer, onToggle }: OrderBumpCardProps) {
  const [checked, setChecked] = useState(false);
  const savings = offer.compare_at_price ? offer.compare_at_price - offer.price : 0;
  const currency = offer.currency || "EUR";

  return (
    <div className={`relative rounded-lg border-2 p-4 transition-all ${checked ? "border-primary bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
      {savings > 0 && (
        <Badge variant="destructive" className="absolute -top-2 right-3 text-xs">
          Poupa {savings.toFixed(2)}€
        </Badge>
      )}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => {
            const val = !!v;
            setChecked(val);
            onToggle(offer.id, val);
          }}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {offer.image_url && <img src={offer.image_url} alt="" className="h-12 w-12 rounded object-cover" />}
            <div>
              <p className="text-sm font-semibold">{offer.headline || offer.name}</p>
              {offer.description && <p className="text-xs text-muted-foreground">{offer.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">{offer.price.toFixed(2)} {currency}</span>
            {offer.compare_at_price && (
              <span className="text-xs text-muted-foreground line-through">{offer.compare_at_price.toFixed(2)} {currency}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
