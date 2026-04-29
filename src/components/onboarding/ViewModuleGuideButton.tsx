import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useModuleOnboarding } from "@/hooks/useModuleOnboarding";
import { ModulePresentationViewer } from "./ModulePresentationViewer";

interface Props {
  moduleSlug: string;
  moduleName: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  label?: string;
}

/**
 * Button to (re)open a module's onboarding presentation in review mode.
 * Place inside any module page header so users can revisit the guide.
 */
export function ViewModuleGuideButton({
  moduleSlug,
  moduleName,
  variant = "ghost",
  size = "sm",
  label = "Ver guia",
}: Props) {
  const [open, setOpen] = useState(false);
  const { slides, hasPresentation } = useModuleOnboarding(moduleSlug);

  if (!hasPresentation) return null;

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <BookOpen className="w-4 h-4 mr-1.5" />
        {label}
      </Button>
      {open && (
        <ModulePresentationViewer
          moduleName={moduleName}
          slides={slides}
          reviewMode
          onComplete={async () => {}}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
