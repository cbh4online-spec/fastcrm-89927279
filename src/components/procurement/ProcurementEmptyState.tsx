import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

interface ProcurementEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ProcurementEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: ProcurementEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-4">
        {icon || <Package className="h-8 w-8 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
