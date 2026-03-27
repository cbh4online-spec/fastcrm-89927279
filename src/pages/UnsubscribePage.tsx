import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === false && data.reason === "already_unsubscribed") setState("already");
        else if (data.valid) setState("valid");
        else setState("invalid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (data?.success) setState("success");
      else if (data?.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {state === "loading" && <p className="text-muted-foreground">A verificar...</p>}
        {state === "valid" && (
          <>
            <h1 className="text-2xl font-bold text-foreground">Cancelar subscrição</h1>
            <p className="text-muted-foreground">
              Tem a certeza que pretende deixar de receber emails?
            </p>
            <button
              onClick={handleUnsubscribe}
              className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 transition"
            >
              Confirmar cancelamento
            </button>
          </>
        )}
        {state === "success" && (
          <>
            <h1 className="text-2xl font-bold text-foreground">Subscrição cancelada</h1>
            <p className="text-muted-foreground">Não receberá mais emails nossos.</p>
          </>
        )}
        {state === "already" && (
          <>
            <h1 className="text-2xl font-bold text-foreground">Já cancelado</h1>
            <p className="text-muted-foreground">Esta subscrição já foi cancelada anteriormente.</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <h1 className="text-2xl font-bold text-foreground">Link inválido</h1>
            <p className="text-muted-foreground">Este link é inválido ou expirou.</p>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-2xl font-bold text-foreground">Erro</h1>
            <p className="text-muted-foreground">Ocorreu um erro. Tente novamente mais tarde.</p>
          </>
        )}
      </div>
    </div>
  );
}
