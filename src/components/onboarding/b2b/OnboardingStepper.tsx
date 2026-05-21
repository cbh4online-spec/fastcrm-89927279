import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
}

interface Props {
  steps: Step[];
  currentIndex: number;
}

export function OnboardingStepper({ steps, currentIndex }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                  done && "bg-primary text-primary-foreground border-primary",
                  active && "bg-primary/10 text-primary border-primary",
                  !done && !active && "bg-muted text-muted-foreground border-border"
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-sm hidden sm:inline",
                  active ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className="w-6 sm:w-10 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
