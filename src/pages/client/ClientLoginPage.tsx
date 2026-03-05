import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { supabase } from "@/integrations/supabase/client";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, AlertCircle } from "lucide-react";

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceSlug = searchParams.get("workspace");
  
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(() => {
    // Try to get from localStorage on initial load
    return localStorage.getItem("client_workspace_id") || undefined;
  });
  const [workspaceResolved, setWorkspaceResolved] = useState(!workspaceSlug);
  
  // Resolve workspace slug to ID
  useEffect(() => {
    if (!workspaceSlug) {
      setWorkspaceResolved(true);
      return;
    }
    
    const resolveWorkspace = async () => {
      const { data } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug.toLowerCase())
        .maybeSingle();
      
      if (data) {
        setWorkspaceId(data.id);
        localStorage.setItem("client_workspace_id", data.id);
      }
      setWorkspaceResolved(true);
    };
    
    resolveWorkspace();
  }, [workspaceSlug]);
  
  const { signIn, signOut, loading, error, isAuthenticated, user, hasAuthButNoClient } = useClientAuth({ workspaceId });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Show message if loading takes too long
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setLoadingTimeout(true), 8000);
      return () => clearTimeout(timer);
    }
    setLoadingTimeout(false);
  }, [loading]);

  // Handle navigation when authenticated - simplified logic
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const handleAuthenticatedUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser?.user_metadata?.requires_password_change) {
          navigate("/client/set-password", { replace: true });
        } else {
          navigate("/client/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Error checking user status:", error);
        navigate("/client/dashboard", { replace: true });
      }
    };
    
    handleAuthenticatedUser();
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    if (!email || !password) {
      setLocalError("Por favor, preencha todos os campos");
      setIsSubmitting(false);
      return;
    }

    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      setLocalError("Credenciais inválidas. Verifique o seu email e palavra-passe.");
      setIsSubmitting(false);
      return;
    }
    
    // Navegação será tratada pelo useEffect quando isAuthenticated mudar
    setIsSubmitting(false);
  };

  // Emit B2B.ACCESS_DENIED when hasAuthButNoClient
  useEffect(() => {
    if (hasAuthButNoClient && user && workspaceId) {
      console.warn(`[B2B-AUTH] ACCESS_DENIED auth_user_id=${user.id} reason=no_client_record`);
      emitKernelEvent({
        workspace_id: workspaceId,
        type: 'B2B.ACCESS_DENIED',
        entity_kind: 'auth_user',
        entity_id: user.id,
        source_module: 'b2b-portal',
        payload: { reason: 'no_client_record', email: user.email },
      });
    }
  }, [hasAuthButNoClient, user, workspaceId]);

  if (loading || !workspaceResolved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {loadingTimeout && (
          <p className="mt-4 text-sm text-muted-foreground">
            A ligação está a demorar. Por favor, atualize a página.
          </p>
        )}
      </div>
    );
  }

  // Show clear error when user is authenticated but not a client
  if (hasAuthButNoClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl">Acesso Não Autorizado</CardTitle>
            <CardDescription>
              Esta conta não está registada como cliente do portal.
              Por favor contacte o administrador para obter acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={signOut} variant="outline" className="w-full">
              Terminar Sessão
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-primary flex items-center justify-center">
            <Package className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Portal do Cliente</CardTitle>
          <CardDescription>
            Aceda ao catálogo de produtos e faça as suas encomendas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(localError || error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{localError || error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Palavra-passe</Label>
                <Link
                  to="/client/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci-me da palavra-passe
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Acesso exclusivo para clientes profissionais registados.</p>
            <p className="mt-1">
              Não tem conta?{" "}
              <a href="mailto:comercial@exemplo.com" className="text-primary hover:underline">
                Contacte-nos
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
