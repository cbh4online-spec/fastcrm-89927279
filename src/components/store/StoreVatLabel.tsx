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

  return (
    <span className={className || "text-[10px] text-muted-foreground"}>
      {includeVat ? "c/ IVA" : `+ IVA (${rate}%)`}
    </span>
  );
}
