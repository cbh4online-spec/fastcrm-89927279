import { useEffect, useState } from "react";
import { useOnboardingState } from "../useActivation";
import { useActivationDetector } from "../useActivationDetector";
import { ActivationWizard } from "./ActivationWizard";
import { ActivationWidget } from "./ActivationWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Provider único que monta wizard inicial + widget flutuante.
 * Deve ficar dentro de WorkspaceProvider.
 */
export function ActivationProvider() {
  const { user } = useAuth();
  const { currentWorkspace, isSuperAdmin } = useWorkspace();
  const { state, isLoading } = useOnboardingState();
  const [wizardOpen, setWizardOpen] = useState(false);

  useActivationDetector();

  useEffect(() => {
    if (!user || !currentWorkspace || isSuperAdmin || isLoading || !state) return;
    if (!state.wizard_completed_at && !state.wizard_skipped) {
      // delay para evitar flash durante navegação
      const t = setTimeout(() => setWizardOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [user, currentWorkspace, isSuperAdmin, state, isLoading]);

  if (!user || !currentWorkspace || isSuperAdmin) return null;

  return (
    <>
      <ActivationWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <ActivationWidget />
    </>
  );
}
