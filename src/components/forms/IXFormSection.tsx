import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IXFormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function IXFormSection({ title, description, children, className, contentClassName }: IXFormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div
        className={cn(
          "rounded-2xl border border-border bg-card p-6 shadow-sm",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
