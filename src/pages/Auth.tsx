import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, Plus, LogOut, Loader2 } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checkingWorkspaces, setCheckingWorkspaces] = useState(false);
  const [hasWorkspaces, setHasWorkspaces] = useState<boolean | null>(null);

  useEffect(() => {
    if (user && !loading) {
      setCheckingWorkspaces(true);
      supabase
        .from("workspace_members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1)
        .then(({ data }) => {
          setHasWorkspaces(data && data.length > 0);
          setCheckingWorkspaces(false);
        });
    }
  }, [user, loading]);

  if (loading || checkingWorkspaces) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is authenticated and has workspaces, go to dashboard
  if (user && hasWorkspaces) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is authenticated but has no workspaces, show options
  if (user && hasWorkspaces === false) {
    return (
      <AuthLayout
        title="Sessão iniciada"
        subtitle={`Olá, ${user.user_metadata?.full_name?.split(" ")[0] || user.email}!`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Já tens sessão iniciada. O que pretendes fazer?
          </p>
          <Button 
            className="w-full" 
            onClick={() => navigate("/onboarding")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Configurar o meu CRM
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={async () => {
              await supabase.auth.signOut();
              setHasWorkspaces(null);
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Entrar com outra conta
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
      subtitle={isLogin ? "Entre na sua conta para continuar" : "Comece sua jornada com o FastCRM"}
    >
      {isLogin ? <LoginForm /> : <SignupForm />}
    </AuthLayout>
  );
}
