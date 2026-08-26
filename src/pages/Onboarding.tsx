import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Building2, Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OnboardingStepper } from "@/components/onboarding/b2b/OnboardingStepper";
import { PendingInvitesList } from "@/components/onboarding/b2b/PendingInvitesList";
import { ExistingWorkspacesList } from "@/components/onboarding/b2b/ExistingWorkspacesList";
import { B2BDetailsForm, type B2BDetails } from "@/components/onboarding/b2b/B2BDetailsForm";
import { ConfirmStep } from "@/components/onboarding/b2b/ConfirmStep";
import { usePendingInvites } from "@/hooks/onboarding/usePendingInvites";
import { useOnboardingActions } from "@/hooks/onboarding/useOnboardingActions";
import { readOnboardingIntent, clearOnboardingIntent } from "@/lib/onboardingIntent";

type Step = "choose" | "details" | "confirm";

const EMPTY: B2BDetails = {
  name: "",
  company_name: "",
  tax_id: "",
  team_size: "",
  business_type: "",
  primary_objective: "",
  my_title: "",
};

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const navigate = useNavigate();
  const { data: invites = [], isLoading: invitesLoading } = usePendingInvites();
  const { createB2B, acceptInvite, selectExisting, submitting } = useOnboardingActions();

  const [step, setStep] = useState<Step>("choose");
  const [details, setDetails] = useState<B2BDetails>(EMPTY);
  const [intentApplied, setIntentApplied] = useState(false);

  const hasWorkspaces = workspaces.length > 0;

  // Retomar a intenção guardada no registo: pré-preencher e ir direto aos dados
  useEffect(() => {
    if (intentApplied || authLoading || workspaceLoading || !user) return;
    if (hasWorkspaces || invitesLoading || invites.length > 0) return;
    const intent = readOnboardingIntent();
    if (intent?.name) {
      setDetails((prev) => ({ ...prev, name: prev.name || intent.name! }));
      setStep("details");
    }
    setIntentApplied(true);
  }, [intentApplied, authLoading, workspaceLoading, user, hasWorkspaces, invitesLoading, invites.length]);

  // Auto-redirect: utilizador já com workspace ativo e fora do wizard
  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (hasWorkspaces && currentWorkspace?.id && step === "choose") {
      // Se já tem workspace selecionado, vai direto para o dashboard
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, workspaceLoading, user, hasWorkspaces, currentWorkspace?.id, step, navigate]);


  const steps = useMemo(
    () => [
      { id: "choose", label: "Começar" },
      { id: "details", label: "Organização" },
      { id: "confirm", label: "Confirmar" },
    ],
    []
  );
  const currentStepIndex = steps.findIndex((s) => s.id === step);

  if (authLoading || workspaceLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "";

  const handleAcceptInvite = async (token: string) => {
    try {
      await acceptInvite(token);
      navigate("/dashboard", { replace: true });
    } catch {/* toast já tratado */}
  };

  const handleConfirm = async () => {
    try {
      await createB2B({
        name: details.name.trim(),
        company_name: details.company_name.trim() || undefined,
        tax_id: details.tax_id.replace(/\s/g, "") || undefined,
        team_size: details.team_size || undefined,
        business_type: details.business_type || undefined,
        primary_objective: details.primary_objective || undefined,
        my_title: details.my_title.trim() || undefined,
      });
      navigate("/dashboard?onboarding=complete", { replace: true });
    } catch {/* toast já tratado */}
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">FastCRM</span>
        </div>

        <OnboardingStepper steps={steps} currentIndex={Math.max(currentStepIndex, 0)} />

        {step === "choose" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Bem-vindo{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="text-muted-foreground">
                Para começar, escolhe ou cria a tua organização.
              </p>
            </div>

            {invitesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PendingInvitesList
                invites={invites}
                onAccept={handleAcceptInvite}
                submitting={submitting}
              />
            )}

            {hasWorkspaces && (
              <ExistingWorkspacesList
                workspaces={workspaces}
                onSelect={(id) => {
                  selectExisting(id);
                  navigate("/dashboard", { replace: true });
                }}
              />
            )}

            {(invites.length > 0 || hasWorkspaces) && <Separator />}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                Criar nova organização
              </div>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="w-full p-5 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-accent/40 transition-colors text-left flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Criar uma nova organização B2B</div>
                  <p className="text-sm text-muted-foreground">
                    Empresa, NIF, equipa — ficas como Owner.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dados da organização</h2>
              <p className="text-muted-foreground mt-1">
                Vamos personalizar o teu FastCRM em função do teu negócio.
              </p>
            </div>
            <B2BDetailsForm
              initial={details}
              onBack={() => setStep("choose")}
              onNext={(v) => {
                setDetails(v);
                setStep("confirm");
              }}
            />
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Confirma os detalhes</h2>
              <p className="text-muted-foreground mt-1">
                Podes alterar tudo depois nas definições da organização.
              </p>
            </div>
            <ConfirmStep
              details={details}
              onBack={() => setStep("details")}
              onConfirm={handleConfirm}
              submitting={submitting}
            />
          </div>
        )}

        <div className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={async () => {
              const { supabase } = await import("@/integrations/supabase/client");
              await supabase.auth.signOut();
              navigate("/login", { replace: true });
            }}
          >
            Terminar sessão
          </Button>
        </div>
      </div>
    </div>
  );
}
