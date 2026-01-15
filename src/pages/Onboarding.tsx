import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, ArrowRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { IntelligentOnboarding } from "@/components/onboarding/IntelligentOnboarding";

export default function Onboarding() {
  const { user } = useAuth();
  const { createWorkspace, workspaces, currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showIntelligentOnboarding, setShowIntelligentOnboarding] = useState(false);

  // If user already has workspaces, redirect to dashboard
  if (workspaces.length > 0 && !showIntelligentOnboarding) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setCreating(true);
    const { error } = await createWorkspace(workspaceName);

    if (error) {
      toast.error("Failed to create workspace");
      setCreating(false);
      return;
    }


    toast.success("Workspace criado!");
    setShowIntelligentOnboarding(true);
  };

  const handleComplete = () => {
    navigate("/dashboard");
  };

  const handleSkip = async () => {
    // Record that onboarding was skipped
    if (currentWorkspace) {
      await supabase.from("workspace_onboarding").upsert({
        workspace_id: currentWorkspace.id,
        skipped: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id' });
    }
    navigate("/dashboard");
  };

  if (showIntelligentOnboarding) {
    return (
      <IntelligentOnboarding
        workspaceName={workspaceName}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">FastCRM</span>
        </div>

        {/* Welcome message */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Bem-vindo, {user?.user_metadata?.full_name?.split(" ")[0] || ""}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Vamos configurar o teu espaço de trabalho
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            <div className="space-y-2">
              <Label htmlFor="workspaceName" className="text-base">
                Nome do Workspace
              </Label>
              <Input
                id="workspaceName"
                placeholder="O nome da tua empresa ou equipa"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="h-12 text-lg"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Tipicamente o nome da tua empresa, equipa ou projeto.
              </p>
            </div>

            {/* Features preview */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                O que vamos configurar:
              </div>
              <div className="space-y-2">
                {[
                  "Pipeline personalizado para o teu negócio",
                  "Campos adaptados ao teu setor",
                  "Formulários de captura de leads",
                  "Automações sugeridas por IA",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={creating || !workspaceName.trim()}
          >
            {creating ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <>
                Continuar
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
