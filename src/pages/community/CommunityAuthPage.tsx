import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicCommunitySettings } from "@/hooks/usePublicCommunity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CommunityAuthPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { data: settings, isLoading } = usePublicCommunitySettings(slug);

  const redirectTo = searchParams.get("redirect") || `/community/${slug}`;
  const initialMode = searchParams.get("mode") === "login" ? "login" : "signup";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (!authLoading && user) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Comunidade não encontrada</h1>
          <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Email ou palavra-passe inválidos");
        setLoading(false);
        return;
      }
      toast.success("Bem-vindo de volta!");
    } else {
      if (password.length < 6) {
        toast.error("A palavra-passe deve ter pelo menos 6 caracteres");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success("Conta criada! Verifique o seu email para confirmar.");
    }

    setLoading(false);
    navigate(redirectTo, { replace: true });
  };

  const primaryColor = (settings as any).primary_color || "#6366f1";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back link */}
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(`/community/${slug}`)}>
          <ArrowLeft className="h-4 w-4" /> Voltar à comunidade
        </Button>

        {/* Community branding */}
        <div className="text-center space-y-3">
          {(settings as any).logo_url && (
            <img
              src={(settings as any).logo_url}
              alt={settings.name}
              className="h-16 w-16 rounded-xl mx-auto object-cover border"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{settings.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "login" ? "Inicie sessão para participar" : "Crie uma conta para participar"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="O seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Palavra-passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
            />
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
            )}
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Não tem conta?{" "}
              <button onClick={() => setMode("signup")} className="text-primary hover:underline font-medium">
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{" "}
              <button onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                Entrar
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
