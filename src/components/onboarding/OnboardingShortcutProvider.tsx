import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useModuleOnboarding, type PresentationTier } from "@/hooks/useModuleOnboarding";
import { ModulePresentationViewer } from "./ModulePresentationViewer";
import { resolveModuleFromPath } from "@/lib/onboarding/resolveModuleFromPath";

function isInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Global keyboard shortcut to open the onboarding guide for the current module.
 *
 * Shortcut: Shift+G  (does not conflict with the existing G→D / G→C sequential nav)
 * Behaviour: resolves the current route → moduleSlug, opens the welcome-tier
 * presentation in review mode. If no guide exists, shows a toast.
 */
export function OnboardingShortcutProvider() {
  const location = useLocation();
  const [tier, setTier] = useState<PresentationTier | null>(null);
  const [resolved, setResolved] = useState<{ slug: string; name: string } | null>(null);

  const open = useCallback(() => {
    const r = resolveModuleFromPath(location.pathname);
    if (!r) {
      toast.info("Sem guia disponível para esta página");
      return;
    }
    setResolved(r);
    setTier("welcome");
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInputFocused()) return;
      // Shift+G  (uppercase G with shift modifier)
      if (e.shiftKey && (e.key === "G" || e.key === "g")) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!tier || !resolved) return null;

  return (
    <ShortcutViewer
      moduleSlug={resolved.slug}
      moduleName={resolved.name}
      tier={tier}
      onClose={() => {
        setTier(null);
        setResolved(null);
      }}
    />
  );
}

function ShortcutViewer({
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
  const { presentation, slides, quiz, hasPresentation, isLoading } = useModuleOnboarding(
    moduleSlug,
    tier
  );

  useEffect(() => {
    if (!isLoading && !hasPresentation) {
      toast.info(`Sem guia disponível para ${moduleName}`);
      onClose();
    }
  }, [isLoading, hasPresentation, moduleName, onClose]);

  if (isLoading || !hasPresentation) return null;

  return (
    <ModulePresentationViewer
      moduleName={moduleName}
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
