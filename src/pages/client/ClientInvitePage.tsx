import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ClientInviteData {
  name: string;
  email: string;
  workspaceName: string;
}

export default function ClientInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientInviteData | null>(null);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateToken = useCallback(async () => {
    if (!token) {
      setError("Link de convite inválido.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("client_users")
        .select(`
          name, 
          email, 
          status,
          invite_expires_at,
          workspace:workspaces(name)
        `)
        .eq("invite_token", token)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching invite:", fetchError);
        setError("Erro ao validar convite. Tente novamente.");
        setLoading(false);
        return;
      }

      if (!data) {
        setError("Link de convite inválido ou expirado.");
        setLoading(false);
        return;
      }

      if (data.status !== "pending") {
        setError("Este convite já foi utilizado. Faça login para aceder ao portal.");
        setLoading(false);
        return;
      }

      if (data.invite_expires_at && new Date(data.invite_expires_at) < new Date()) {
        setError("O link de convite expirou. Contacte o administrador para obter um novo convite.");
        setLoading(false);
        return;
      }

      // Type assertion for workspace relation
      const workspace = data.workspace as { name: string } | null;

      setClientData({
        name: data.name,
        email: data.email,
        workspaceName: workspace?.name || "Portal de Clientes",
      });
      setLoading(false);
    } catch (err) {
      console.error("Exception validating token:", err);
      setError("Erro inesperado. Tente novamente mais tarde.");
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const handleActivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (password.length < 8) {
      toast.error("A palavra-passe deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As palavras-passe não coincidem");
      return;
    }

    setSubmitting(true);

    try {
      // Call edge function to activate account
      const { data: authResult, error: authError } = await supabase.functions.invoke(
        "activate-client-invite",
        {
          body: {
            token,
            password,
          },
        }
      );

      if (authError) {
        console.error("Error activating account:", authError);
        toast.error("Erro ao activar conta. Tente novamente.");
        setSubmitting(false);
        return;
      }

      if (!authResult?.success) {
        toast.error(authResult?.error || "Erro ao activar conta.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);

      // Auto sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: clientData!.email,
        password,
      });

      if (signInError) {
        console.error("Auto sign-in error:", signInError);
        toast.success("Conta activada! Faça login para continuar.");
        setTimeout(() => navigate("/client/login"), 2000);
        return;
      }

      toast.success("Bem-vindo ao Portal de Clientes!");
      setTimeout(() => navigate("/client/dashboard"), 1500);
    } catch (err) {
      console.error("Exception activating account:", err);
      toast.error("Erro inesperado. Tente novamente.");
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">A validar convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-destructive/10 p-3 w-fit">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/client/login")}>
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-green-100 p-3 w-fit">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Conta Activada!</CardTitle>
            <CardDescription>
              A sua conta foi configurada com sucesso. A redirecionar para o portal...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-primary/10 p-3 w-fit">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Bem-vindo ao {clientData?.workspaceName}</CardTitle>
          <CardDescription>
            Olá <strong>{clientData?.name}</strong>, configure a sua palavra-passe para aceder ao portal.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleActivateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                value={clientData?.email || ""} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nova Palavra-passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Palavra-passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir palavra-passe"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <Alert variant="destructive">
                <AlertDescription>
                  As palavras-passe não coincidem.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting || password.length < 8 || password !== confirmPassword}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A activar conta...
                </>
              ) : (
                "Activar Conta"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Button 
              variant="link" 
              className="px-0 h-auto font-normal"
              onClick={() => navigate("/client/login")}
            >
              Fazer login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
