import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package } from "lucide-react";
import { TrustBadges } from "./TrustBadges";

interface LineItem {
  name: string;
  quantity: number;
  price: number;
  sku?: string | null;
  image_url?: string | null;
  compare_at_price?: number | null;
}

interface OrderSummaryProps {
  items: LineItem[];
  bumps?: LineItem[];
  /** Base tributável (sem IVA). */
  net?: number;
  /** Montante de IVA. */
  tax?: number;
  subtotal: number;
  discount?: number;
  discountLabel?: string;
  shipping?: number;
  total: number;
  currency?: string;
}

export function OrderSummary({
  items, bumps, net, tax, subtotal, discount, discountLabel, shipping, total, currency = "EUR",
}: OrderSummaryProps) {
  const fmt = (v: number) => `${v.toFixed(2)} ${currency}`;

  const renderLine = (item: LineItem, key: string, isBump = false) => (
    <div key={key} className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {item.image_url
          ? <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          : <Package className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isBump ? "text-primary" : ""}`}>
          {isBump ? "+ " : ""}{item.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.sku ? `SKU ${item.sku} · ` : ""}{item.quantity} × {fmt(item.price)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{fmt(item.price * item.quantity)}</p>
        {item.compare_at_price && item.compare_at_price > item.price && (
          <p className="text-xs text-muted-foreground line-through">{fmt(item.compare_at_price * item.quantity)}</p>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Resumo da encomenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.map((item, i) => renderLine(item, `item-${i}`))}
        </div>

        {bumps && bumps.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              {bumps.map((b, i) => renderLine(b, `bump-${i}`, true))}
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          {net !== undefined ? (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal (s/ IVA)</span>
              <span>{fmt(net)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
          )}
          {tax !== undefined && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>IVA</span>
              <span>{fmt(tax)}</span>
            </div>
          )}
          {discount !== undefined && discount > 0 && (
            <div className="flex justify-between text-sm text-primary">
              <span>{discountLabel || "Desconto"}</span>
              <span>-{fmt(discount)}</span>
            </div>
          )}
          {shipping !== undefined && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Envio</span>
              <span>{shipping === 0 ? "Grátis" : fmt(shipping)}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="text-2xl font-bold">{fmt(total)}</span>
        </div>

        <TrustBadges />
      </CardContent>
    </Card>
  );
}
