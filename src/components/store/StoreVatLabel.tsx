import { useStoreVat } from "@/contexts/StoreVatContext";

interface StoreVatLabelProps {
  pricesIncludeVat?: boolean;
  vatRate?: number;
  className?: string;
}

export function StoreVatLabel({ pricesIncludeVat, vatRate, className }: StoreVatLabelProps) {
  const ctx = useStoreVat();
  const includeVat = pricesIncludeVat ?? ctx.pricesIncludeVat;
  const rate = vatRate ?? ctx.vatRate;
  const isB2B = ctx.isB2B;

  const label = isB2B
    ? "s/ IVA"
    : includeVat
      ? "c/ IVA"
      : `+ IVA (${rate}%)`;

  return (
    <span className={className || "text-[10px] text-muted-foreground"}>
      {label}
    </span>
  );
}
