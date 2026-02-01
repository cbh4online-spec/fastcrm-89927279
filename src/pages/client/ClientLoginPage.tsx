import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, AlertCircle } from "lucide-react";

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const { signIn, loading, error, isAuthenticated, user } = useClientAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user needs to change password after login
  useEffect(() => {
    const checkPasswordChangeRequired = async () => {
      if (user) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.user_metadata?.requires_password_change) {
          navigate("/client/set-password", { replace: true });
          return;
        }
      }
    };

    if (isAuthenticated) {
      checkPasswordChangeRequired().then(() => {
        // Only navigate to dashboard if password change is not required
        const checkAgain = async () => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser?.user_metadata?.requires_password_change) {
            navigate("/client/dashboard", { replace: true });
          }
        };
        checkAgain();
      });
    }
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
    
    // Check if password change is required
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.user_metadata?.requires_password_change) {
      navigate("/client/set-password");
    } else {
      navigate("/client/dashboard");
    }
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
