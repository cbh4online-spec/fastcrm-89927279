import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

export default function Onboarding() {
  const { user } = useAuth();
  const { createWorkspace, workspaces } = useWorkspace();
  const navigate = useNavigate();
  const [workspaceName, setWorkspaceName] = useState("");
  const [creating, setCreating] = useState(false);

  // If user already has workspaces, redirect to dashboard
  if (workspaces.length > 0) {
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

    toast.success("Workspace created!");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">WorkspaceOS</span>
        </div>

        {/* Welcome message */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {user?.user_metadata?.full_name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's set up your first workspace
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 rounded-xl border border-border bg-card space-y-6">
            <div className="space-y-2">
              <Label htmlFor="workspaceName" className="text-base">
                Workspace name
              </Label>
              <Input
                id="workspaceName"
                placeholder="Your company or team name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="h-12 text-lg"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                This is typically your company, team, or project name.
              </p>
            </div>

            {/* Features preview */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm font-medium text-foreground">What you'll get:</p>
              <div className="space-y-2">
                {[
                  "Unlimited team members",
                  "Role-based access control",
                  "CRM & contact management",
                  "Secure data isolation",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-success" />
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
                Create workspace
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
