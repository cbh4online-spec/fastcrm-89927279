import { Button } from "@/components/ui/button";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";

interface Props {
  price: number;
  currency: string;
  ctaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  priceOnRequest?: boolean;
}

/**
 * Fixed bottom bar for mobile with price + CTA.
 * Uses safe area padding to avoid overlapping OS nav.
 */
export function OfferStickyCTA({ price, currency, ctaLabel, onClick, disabled, priceOnRequest }: Props) {
  return (
    <>
      {/* Spacer so page content isn't hidden behind the sticky bar */}
      <div aria-hidden className="h-20 md:hidden" />
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-lg backdrop-blur md:hidden"
        role="region"
        aria-label="Ação de compra"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {priceOnRequest ? (
              <p className="text-sm font-semibold">Sob consulta</p>
            ) : (
              <>
                <p className="text-lg font-bold leading-tight">
                  {new Intl.NumberFormat("pt-PT", {
                    style: "currency",
                    currency: currency || "EUR",
                  }).format(price)}
                </p>
                <StoreVatLabel className="text-[10px]" />
              </>
            )}
          </div>
          <Button
            type="button"
            onClick={onClick}
            disabled={disabled}
            size="lg"
            className="shrink-0 rounded-xl px-6 font-semibold"
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
