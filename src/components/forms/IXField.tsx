import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface IXFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  counter?: { value: number; max: number };
  className?: string;
  children: ReactNode;
}

export function IXField({ label, htmlFor, required, hint, counter, className, children }: IXFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </Label>
      {children}
      {(hint || counter) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{hint}</span>
          {counter && (
            <span className="italic">
              ({counter.value}/{counter.max})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
