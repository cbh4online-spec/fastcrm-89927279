import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);

    if (error) {
      toast.error("Erro ao enviar email de recuperação. Tenta novamente.");
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout
        title="Email enviado"
        subtitle="Verifica a tua caixa de entrada"
      >
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Se o email <strong>{email}</strong> estiver registado, receberás um link para redefinir a tua password.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Recuperar password"
      subtitle="Insere o teu email para receber o link de recuperação"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="o.teu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading || !email}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Enviar link de recuperação
        </Button>

        <Link to="/login" className="block">
          <Button variant="ghost" className="w-full" type="button">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao login
          </Button>
        </Link>
      </form>
    </AuthLayout>
  );
}
