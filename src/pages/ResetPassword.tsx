import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", valid: newPassword.length >= 8 },
    { label: "Contém letra maiúscula", valid: /[A-Z]/.test(newPassword) },
    { label: "Contém letra minúscula", valid: /[a-z]/.test(newPassword) },
    { label: "Contém número", valid: /[0-9]/.test(newPassword) },
  ];

  const isPasswordValid = passwordRequirements.every((req) => req.valid);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    // O link de recuperação pode conter o token no hash — o cliente Supabase
    // processa-o automaticamente e emite o evento PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setIsValidSession(true);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError("A palavra-passe não cumpre os requisitos mínimos");
      return;
    }
    if (!passwordsMatch) {
      setError("As palavras-passe não coincidem");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      toast.success("Palavra-passe atualizada com sucesso!");
      // Terminar a sessão de recovery para forçar login com a nova password
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar palavra-passe. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <AuthLayout
        title="Link inválido ou expirado"
        subtitle="Este link de recuperação já não é válido"
      >
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O link de recuperação expirou ou já foi utilizado. Peça um novo link.
            </AlertDescription>
          </Alert>
          <Link to="/forgot-password" className="block">
            <Button className="w-full">Pedir novo link</Button>
          </Link>
          <Link to="/login" className="block">
            <Button variant="ghost" className="w-full">Voltar ao login</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Definir nova palavra-passe"
      subtitle="Escolha uma nova palavra-passe para a sua conta"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="new-password">Nova palavra-passe</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showNewPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {passwordRequirements.map((req) => (
            <div key={req.label} className="flex items-center gap-2 text-xs">
              {req.valid ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={req.valid ? "text-green-600" : "text-muted-foreground"}>
                {req.label}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar palavra-passe</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-destructive">As palavras-passe não coincidem</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !isPasswordValid || !passwordsMatch}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <CheckCircle className="h-4 w-4 mr-2" />
          Guardar nova palavra-passe
        </Button>
      </form>
    </AuthLayout>
  );
}
