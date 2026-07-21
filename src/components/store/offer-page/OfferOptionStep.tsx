import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
  hidden?: boolean;
}

export function OfferOptionStep({ step, title, description, children, hidden }: Props) {
  if (hidden) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground",
          )}
          aria-hidden
        >
          {step}
        </span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}
