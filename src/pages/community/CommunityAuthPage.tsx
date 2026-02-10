import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicCommunitySettings } from "@/hooks/usePublicCommunity";
import { usePublicMembershipQuestions } from "@/hooks/useMembershipQuestions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CommunityAuthPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const { data: settings, isLoading } = usePublicCommunitySettings(slug);

  const inviteToken = searchParams.get("invite");
  const redirectTo = searchParams.get("redirect") || `/community/${slug}`;
  const initialMode = searchParams.get("mode") === "login" ? "login" : "signup";
  const [mode, setMode] = useState<"login" | "signup">(inviteToken ? "signup" : initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState<{ name: string; email: string } | null>(null);

  // Questions step
  const questionsEnabled = (settings as any)?.membership_questions_enabled === true;
  const { data: questions = [] } = usePublicMembershipQuestions(
    questionsEnabled && mode === "signup" ? (settings as any)?.workspace_id : undefined
  );
  const [step, setStep] = useState<"credentials" | "questions">("credentials");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Load invite data if token present
  useEffect(() => {
    if (!inviteToken) return;
    supabase
      .from("community_members")
      .select("name, email, status, invite_expires_at")
      .eq("invite_token", inviteToken)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).status === "pending") {
          const expires = new Date((data as any).invite_expires_at);
          if (expires > new Date()) {
            setInviteData({ name: (data as any).name, email: (data as any).email });
            setFullName((data as any).name);
            setEmail((data as any).email);
          } else {
            toast.error("Este convite expirou");
          }
        }
      });
  }, [inviteToken]);

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

  const hasQuestions = questionsEnabled && questions.length > 0;

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && hasQuestions) {
      // Go to questions step
      setStep("questions");
    } else {
      handleFinalSubmit(e);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
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

      // Save answers if any
      if (hasQuestions && Object.keys(answers).length > 0 && (settings as any)?.workspace_id) {
        try {
          // Find the community member record (by invite token or email)
          let memberId: string | null = null;
          if (inviteToken) {
            const { data: member } = await supabase
              .from("community_members")
              .select("id")
              .eq("invite_token", inviteToken)
              .maybeSingle();
            memberId = member?.id || null;
          }

          const answerRows = Object.entries(answers)
            .filter(([_, val]) => val.trim())
            .map(([questionId, answerText]) => ({
              workspace_id: (settings as any).workspace_id,
              question_id: questionId,
              member_id: memberId,
              user_id: null,
              answer_text: answerText.trim(),
            }));

          if (answerRows.length > 0) {
            await supabase
              .from("community_membership_answers")
              .insert(answerRows as any);
          }
        } catch (err) {
          console.error("Error saving answers:", err);
        }
      }

      // Activate community member if invite token
      if (inviteToken) {
        try {
          await supabase
            .from("community_members")
            .update({ status: "active", joined_at: new Date().toISOString() } as any)
            .eq("invite_token", inviteToken);
        } catch (e) {
          console.error("Error activating invite:", e);
        }
      }
    }

    setLoading(false);
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Back link */}
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => step === "questions" ? setStep("credentials") : navigate(`/community/${slug}`)}>
          <ArrowLeft className="h-4 w-4" /> {step === "questions" ? "Voltar" : "Voltar à comunidade"}
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
              {step === "questions"
                ? "Responda às seguintes perguntas para completar a adesão"
                : mode === "login" ? "Inicie sessão para participar" : "Crie uma conta para participar"}
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
              {mode === "login" ? "Entrar" : hasQuestions ? "Continuar" : "Criar conta"}
            </Button>
          </form>
        )}

        {/* Questions Step */}
        {step === "questions" && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label>{q.question_text}</Label>
                {q.question_type === "textarea" ? (
                  <Textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="A sua resposta..."
                    required
                  />
                ) : q.question_type === "select" && q.options ? (
                  <Select
                    value={answers[q.id] || ""}
                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                    required
                  >
                    <SelectTrigger className="h-11"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {(q.options as string[]).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="A sua resposta..."
                    required
                    className="h-11"
                  />
                )}
              </div>
            ))}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar conta
            </Button>
          </form>
        )}

        {step === "credentials" && (
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
        )}
      </div>
    </div>
  );
}
