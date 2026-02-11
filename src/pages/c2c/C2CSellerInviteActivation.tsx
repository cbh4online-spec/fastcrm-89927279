import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function C2CSellerInviteActivation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [iban, setIban] = useState("");
  const [nif, setNif] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Token inválido");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("c2c_seller_invites" as any)
        .select("*")
        .eq("invite_token", token)
        .maybeSingle();

      if (fetchError || !data) {
        setError("Convite não encontrado ou expirado");
        setLoading(false);
        return;
      }

      const inv = data as any;
      if (inv.status !== "pending") {
        setError("Este convite já foi utilizado");
        setLoading(false);
        return;
      }

      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        setError("Este convite expirou. Contacte o administrador para obter um novo.");
        setLoading(false);
        return;
      }

      setInvite(inv);
      setLoading(false);
    }

    validateToken();
  }, [token]);

  const handleActivate = async () => {
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
      const { data, error: fnError } = await supabase.functions.invoke("activate-c2c-seller-invite", {
        body: { token, password, phone, iban, nif, location },
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Erro na ativação");

      // Auto-login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });

      if (loginError) {
        console.error("Auto-login failed:", loginError);
      }

      setActivated(true);
      toast.success("Conta de vendedor ativada com sucesso!");

      // Get workspace slug to redirect
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("slug")
        .eq("id", invite.workspace_id)
        .single();

      setTimeout(() => {
        if (workspace?.slug) {
          navigate(`/c2c/${(workspace as any).slug}`);
        } else {
          navigate("/");
        }
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao ativar conta");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-bold">Convite Inválido</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-xl font-bold">Conta Ativada!</h2>
            <p className="text-muted-foreground">A tua conta de vendedor está pronta. A redirecionar para o marketplace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ativar Conta de Vendedor</CardTitle>
          <CardDescription>
            Olá <strong>{invite?.name}</strong>! Completa o registo para começar a vender.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={invite?.name || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invite?.email || ""} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Palavra-passe *</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar *</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetir palavra-passe" />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Dados de vendedor (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 912 345 678" />
              </div>
              <div className="space-y-2">
                <Label>Localização</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lisboa, Portugal" />
              </div>
              <div className="space-y-2">
                <Label>NIF</Label>
                <Input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="123456789" />
              </div>
              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="PT50..." />
              </div>
            </div>
          </div>

          <Button onClick={handleActivate} disabled={submitting || !password} className="w-full gap-2" size="lg">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submitting ? "A ativar..." : "Ativar Conta de Vendedor"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
