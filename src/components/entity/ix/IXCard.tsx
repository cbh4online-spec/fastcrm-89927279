import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IXCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function IXCard({ title, description, actions, children, className, contentClassName }: IXCardProps) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cn("px-6 pb-6", !title && "pt-6", contentClassName)}>{children}</div>
    </section>
  );
}
