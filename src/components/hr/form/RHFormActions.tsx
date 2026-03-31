import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RHFormActionsProps {
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export function RHFormActions({
  onCancel,
  isSubmitting = false,
  submitLabel = "Guardar",
  submittingLabel = "A guardar...",
  cancelLabel = "Cancelar",
  fullWidth = false,
  disabled = false,
}: RHFormActionsProps) {
  return (
    <div className={fullWidth ? "space-y-0" : "flex justify-end gap-2"}>
      {fullWidth ? (
        <Button
          type="submit"
          disabled={isSubmitting || disabled}
          className="w-full"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      ) : (
        <>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" disabled={isSubmitting || disabled}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </>
      )}
    </div>
  );
}
