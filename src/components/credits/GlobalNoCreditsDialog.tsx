import { NoCreditsPurchaseDialog } from "@/components/credits/NoCreditsPurchaseDialog";
import { useNoCreditsDialog } from "@/hooks/useNoCreditsDialog";

export function GlobalNoCreditsDialog() {
  const { open, actionLabel, creditsNeeded, setOpen } = useNoCreditsDialog();
  return (
    <NoCreditsPurchaseDialog
      open={open}
      onOpenChange={setOpen}
      actionLabel={actionLabel}
      creditsNeeded={creditsNeeded}
    />
  );
}
