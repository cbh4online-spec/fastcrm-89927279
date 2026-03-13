import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrustBadges } from "./TrustBadges";

interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderSummaryProps {
  items: LineItem[];
  bumps?: LineItem[];
  subtotal: number;
  discount?: number;
  discountLabel?: string;
  shipping?: number;
  total: number;
  currency?: string;
}

export function OrderSummary({ items, bumps, subtotal, discount, discountLabel, shipping, total, currency = "EUR" }: OrderSummaryProps) {
  const fmt = (v: number) => `${v.toFixed(2)} ${currency}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Resumo da Encomenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>{item.name} × {item.quantity}</span>
            <span>{fmt(item.price * item.quantity)}</span>
          </div>
        ))}
        {bumps && bumps.length > 0 && (
          <>
            <Separator />
            {bumps.map((b, i) => (
              <div key={i} className="flex justify-between text-sm text-primary">
                <span>+ {b.name}</span>
                <span>{fmt(b.price)}</span>
              </div>
            ))}
          </>
        )}
        <Separator />
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{fmt(subtotal)}</span>
        </div>
        {discount && discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>{discountLabel || "Desconto"}</span>
            <span>-{fmt(discount)}</span>
          </div>
        )}
        {shipping !== undefined && (
          <div className="flex justify-between text-sm">
            <span>Envio</span>
            <span>{shipping === 0 ? "Grátis" : fmt(shipping)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
        <TrustBadges />
      </CardContent>
    </Card>
  );
}
