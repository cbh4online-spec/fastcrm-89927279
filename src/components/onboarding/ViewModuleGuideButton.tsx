import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";
import { useModuleOnboarding, type PresentationTier } from "@/hooks/useModuleOnboarding";
import { ModulePresentationViewer } from "./ModulePresentationViewer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Props {
  moduleSlug: string;
  moduleName: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  label?: string;
}

/**
 * Button to (re)open a module's onboarding presentation in review mode.
 * Supports multi-tier journey: welcome (always), intermediate, advanced.
 */
export function ViewModuleGuideButton({
  moduleSlug,
  moduleName,
  variant = "ghost",
  size = "sm",
  label = "Ver guia",
}: Props) {
  const [activeTier, setActiveTier] = useState<PresentationTier | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size}>
            <BookOpen className="w-4 h-4 mr-1.5" />
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Guias deste módulo</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setActiveTier("welcome")}>
            🎓 Boas-vindas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveTier("intermediate")}>
            🚀 Intermédio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveTier("advanced")}>
            ⚡ Avançado
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {activeTier && (
        <TierViewer
          moduleSlug={moduleSlug}
          moduleName={moduleName}
          tier={activeTier}
          onClose={() => setActiveTier(null)}
        />
      )}
    </>
  );
}

function TierViewer({
  moduleSlug,
  moduleName,
  tier,
  onClose,
}: {
  moduleSlug: string;
  moduleName: string;
  tier: PresentationTier;
  onClose: () => void;
}) {
  const { presentation, slides, quiz, hasPresentation, isLoading } = useModuleOnboarding(moduleSlug, tier);

  if (isLoading) return null;
  if (!hasPresentation) {
    // Show empty state via toast-less inline modal close
    setTimeout(() => onClose(), 0);
    return null;
  }

  return (
    <ModulePresentationViewer
      moduleName={`${moduleName} · ${tierLabel(tier)}`}
      slides={slides}
      quiz={quiz}
      minScorePercent={presentation?.min_score_percent ?? 70}
      xpReward={presentation?.xp_reward ?? 50}
      allowLiveMode={presentation?.allow_live_mode ?? true}
      reviewMode
      onComplete={async () => {}}
      onClose={onClose}
    />
  );
}

function tierLabel(tier: PresentationTier) {
  return tier === "welcome" ? "Boas-vindas" : tier === "intermediate" ? "Intermédio" : "Avançado";
}
