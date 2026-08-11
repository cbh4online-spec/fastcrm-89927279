import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, AlertCircle } from "lucide-react";
import { PartnerLoadingScreen } from "@/components/partner/PartnerLoadingScreen";

export default function PartnerLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceSlug = searchParams.get("workspace");

  const [workspaceId, setWorkspaceId] = useState<string | undefined>(() =>
    localStorage.getItem("partner_workspace_id") || undefined
  );
  const [workspaceResolved, setWorkspaceResolved] = useState(!workspaceSlug);

  useEffect(() => {
    if (!workspaceSlug) { setWorkspaceResolved(true); return; }
    const resolve = async () => {
      const { data } = await supabase.from("public_workspaces").select("id").eq("slug", workspaceSlug.toLowerCase()).maybeSingle();
      if (data) { setWorkspaceId(data.id); localStorage.setItem("partner_workspace_id", data.id); }
      setWorkspaceResolved(true);
    };
    resolve();
  }, [workspaceSlug]);

  const { signIn, signOut, loading, error, isAuthenticated, user, hasAuthButNoPartner } = usePartnerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate("/partner/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);
    if (!email || !password) { setLocalError("Preencha todos os campos"); setIsSubmitting(false); return; }
    const { error: err } = await signIn(email, password, workspaceId);
    if (err) setLocalError("Credenciais inválidas.");
    setIsSubmitting(false);
  };

  if (loading || !workspaceResolved) {
    return <PartnerLoadingScreen message="A preparar o login…" />;
  }

  if (hasAuthButNoPartner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Acesso Não Autorizado</CardTitle>
            <CardDescription>Esta conta não está registada como parceiro. Contacte o gestor comercial.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={signOut} variant="outline" className="w-full">Terminar Sessão</Button>
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
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Partner Center</CardTitle>
          <CardDescription>Aceda ao portal de parceiros e faça as suas encomendas B2B</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {(localError || error) && (
              <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{localError || error}</AlertDescription></Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="parceiro@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Entrar
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Acesso exclusivo para parceiros e revendedores registados.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
