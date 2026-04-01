import { StoreGiftCardBalance } from "@/components/store/StoreGiftCardBalance";
import { trackEvent } from "@/lib/analytics";

interface CheckoutGiftCardSectionProps {
  workspaceSlug: string;
  appliedGiftCard: { id: string; code: string; current_balance: number } | null;
  onApply: (gc: { id: string; code: string; current_balance: number } | null) => void;
  onRemove: () => void;
}

export function CheckoutGiftCardSection({ workspaceSlug, appliedGiftCard, onApply, onRemove }: CheckoutGiftCardSectionProps) {
  return (
    <StoreGiftCardBalance
      workspaceId={workspaceSlug}
      appliedGiftCard={appliedGiftCard}
      onApply={(gc) => {
        onApply(gc);
        trackEvent("apply_gift_card", { workspaceSlug, giftCardCode: gc?.code });
      }}
      onRemove={onRemove}
    />
  );
}
