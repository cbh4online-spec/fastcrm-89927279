import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauthApi(): OAuthApi | null {
  const api = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
  return api ?? null;
}

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Falta o parâmetro authorization_id.");
        return;
      }
      const api = oauthApi();
      if (!api) {
        setError("O servidor de autorização não está disponível nesta aplicação.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(next)}`;
        return;
      }
      const { data, error: err } = await api.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const api = oauthApi();
    if (!api) return;
    setBusy(true);
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorizationId)
      : await api.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não devolveu um destino de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "esta aplicação";

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          <CardTitle>
            {error ? "Não foi possível continuar" : `Ligar ${clientName} ao FastCRM`}
          </CardTitle>
          <CardDescription>
            {error
              ? error
              : details
                ? `${clientName} vai poder aceder aos dados do FastCRM em seu nome, com as suas permissões.`
                : "A carregar pedido de autorização…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          {!error && !details && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> A carregar…
            </div>
          )}
          {!error && details && (
            <>
              <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Autorizar
              </Button>
              <Button variant="outline" onClick={() => decide(false)} disabled={busy} className="flex-1">
                Recusar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
