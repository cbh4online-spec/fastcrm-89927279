import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface InviteData {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  workspace_name?: string;
}

export default function AcceptWorkspaceInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"info" | "login" | "signup">("info");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
    try {
      // Use service-level access via RPC or direct query
      const { data, error: fetchError } = await supabase
        .from("workspace_invites" as any)
        .select("id, workspace_id, email, role, status, expires_at")
        .eq("invite_token", token)
        .single();

      if (fetchError || !data) {
        setError("Convite não encontrado ou inválido.");
        setLoading(false);
        return;
      }

      const inviteData = data as any;

      if (inviteData.status !== "pending") {
        setError("Este convite já foi utilizado ou revogado.");
        setLoading(false);
        return;
      }

      if (new Date(inviteData.expires_at) < new Date()) {
        setError("Este convite expirou.");
        setLoading(false);
        return;
      }

      // Get workspace name
      const { data: ws } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", inviteData.workspace_id)
        .single();

      setInvite({
        ...inviteData,
        workspace_name: ws?.name || "Workspace",
      });
      setSignupEmail(inviteData.email);
      setLoginEmail(inviteData.email);
    } catch (err) {
      setError("Erro ao carregar convite.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-accept if user is already logged in
  useEffect(() => {
    if (!authLoading && user && invite && mode === "info") {
      acceptInvite();
    }
  }, [user, authLoading, invite]);

  const acceptInvite = async () => {
    if (!invite || accepting) return;
    setAccepting(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setMode("login");
        setAccepting(false);
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", invite.workspace_id)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (existing) {
        toast.info("Já é membro deste workspace.");
        navigate("/dashboard");
        return;
      }

      // Add to workspace
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert([{
          workspace_id: invite.workspace_id,
          user_id: currentUser.id,
          role: invite.role as any,
        }]);

      if (memberError) throw memberError;

      // Mark invite as accepted
      await supabase
        .from("workspace_invites" as any)
        .update({ status: "accepted", accepted_at: new Date().toISOString() } as any)
        .eq("id", invite.id);

      toast.success(`Bem-vindo à equipa ${invite.workspace_name}!`);
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error accepting invite:", err);
      toast.error(err.message || "Erro ao aceitar convite");
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = async () => {
    setAccepting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      // onAuthStateChange will trigger acceptInvite via useEffect
    } catch (err: any) {
      toast.error(err.message || "Erro no login");
      setAccepting(false);
    }
  };

  const handleSignup = async () => {
    setAccepting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/invite/${token}`,
          data: { full_name: signupName },
        },
      });
      if (error) throw error;
      toast.success("Conta criada! Verifique o seu email para confirmar e depois volte a este link.");
      setAccepting(false);
    } catch (err: any) {
      toast.error(err.message || "Erro no registo");
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/login")}>Ir para o Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepting && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-2" />
            <CardTitle>A aceitar convite...</CardTitle>
            <CardDescription>A adicionar ao workspace {invite?.workspace_name}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserPlus className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>Convite para {invite?.workspace_name}</CardTitle>
          <CardDescription>
            Foi convidado como <strong>{invite?.role === "admin" ? "Administrador" : invite?.role === "agent" ? "Agente" : "Visualizador"}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "info" && !user && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Para aceitar o convite, faça login ou crie uma conta.
              </p>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setMode("login")}>Fazer Login</Button>
                <Button className="flex-1" variant="outline" onClick={() => setMode("signup")}>Criar Conta</Button>
              </div>
            </div>
          )}

          {mode === "login" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={accepting}>
                {accepting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar e Aceitar Convite
              </Button>
              <Button variant="link" className="w-full" onClick={() => setMode("signup")}>
                Não tem conta? Criar conta
              </Button>
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={signupName} onChange={(e) => setSignupName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <Button className="w-full" onClick={handleSignup} disabled={accepting}>
                {accepting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Conta
              </Button>
              <Button variant="link" className="w-full" onClick={() => setMode("login")}>
                Já tem conta? Fazer login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
