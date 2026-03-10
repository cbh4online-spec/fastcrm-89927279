import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function VisionDuoAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth_required">("loading");
  const [visionTitle, setVisionTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("auth_required");
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage("Token de convite inválido.");
      return;
    }

    acceptInvite();
  }, [user, authLoading, token]);

  const acceptInvite = async () => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("vision-duo-invite", {
        body: { action: "accept", token, userId: user!.id },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        setStatus("error");
        setErrorMessage(data.error);
        return;
      }

      setVisionTitle(data.visionTitle || "");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro ao aceitar convite.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/50">
        <CardContent className="p-8 text-center space-y-6">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-violet-500 animate-spin mx-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">A processar convite...</h1>
                <p className="text-sm text-muted-foreground mt-2">Aguarda um momento.</p>
              </div>
            </>
          )}

          {status === "auth_required" && (
            <>
              <Eye className="h-12 w-12 text-violet-500 mx-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Convite Vision Duo</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Precisas de iniciar sessão para aceitar este convite.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => navigate(`/login?redirect=/vision/duo/accept/${token}`)}
              >
                Iniciar Sessão
              </Button>
              <p className="text-xs text-muted-foreground">
                Ainda não tens conta?{" "}
                <button
                  className="text-primary underline"
                  onClick={() => navigate(`/signup?redirect=/vision/duo/accept/${token}`)}
                >
                  Criar conta
                </button>
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Convite aceite! 🎉</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Agora és parceiro(a) de accountability na visão
                  {visionTitle && <strong className="text-foreground"> "{visionTitle}"</strong>}.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate("/dashboard/vision")}>
                Ir para Método Vision
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Erro no convite</h1>
                <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard/vision")}>
                Ir para Método Vision
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
