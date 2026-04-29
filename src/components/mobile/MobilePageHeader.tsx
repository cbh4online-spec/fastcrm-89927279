import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { haptics } from "@/hooks/useHaptics";

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  /** Show back button. If `onBack` is omitted, navigates(-1). */
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
}

/**
 * Native-app-style page header for mobile screens.
 * Sticky, respects safe-area-top, includes back button + optional right action.
 * Hidden on tablet+/desktop (use the regular page header there).
 */
export function MobilePageHeader({
  title,
  subtitle,
  back,
  onBack,
  right,
  className,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    haptics.tap();
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <header
      className={cn(
        "md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border",
        "safe-area-pt",
        className
      )}
    >
      <div className="flex items-center gap-2 h-14 px-2">
        {back && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            aria-label="Voltar"
            className="h-10 w-10 -ml-1"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        {right && <div className="flex items-center gap-1">{right}</div>}
      </div>
    </header>
  );
}
