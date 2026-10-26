import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

type OAuthRedirect = { redirect_url?: string; redirect_to?: string };
type OAuthDetails = OAuthRedirect & {
  client?: { name?: string } | null;
  scope?: string;
};
type OAuthResult<T> = { data: T | null; error: unknown };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult<OAuthDetails>>;
  approveAuthorization: (id: string) => Promise<OAuthResult<OAuthRedirect>>;
  denyAuthorization: (id: string) => Promise<OAuthResult<OAuthRedirect>>;
};

const SCOPE_LABELS: Record<string, string> = {
  email: "Endereço de email",
  profile: "Informações do perfil",
  phone: "Número de telefone",
  openid: "Identificação da conta (OpenID)",
};
const LOAD_ERROR = "Não foi possível carregar o pedido de autorização. Volte a iniciar a ligação na aplicação que fez o pedido.";
const DECISION_ERROR = "Não foi possível concluir a autorização. Volte a iniciar a ligação na aplicação que fez o pedido.";

function oauthApi(): OAuthApi | null {
  const api = (supabase.auth as unknown as { oauth?: OAuthApi }).oauth;
  return api ?? null;
}

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setDetails(null);
    setError(null);
    setBusy(false);
    (async () => {
      try {
        if (!authorizationId) {
          setError("O pedido de autorização está incompleto. Volte a iniciar a ligação.");
          return;
        }
        const api = oauthApi();
        if (!api) {
          setError(LOAD_ERROR);
          return;
        }
        const { data: sess, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;
        if (sessionError) {
          setError(LOAD_ERROR);
          return;
        }
        if (!sess.session) {
          const next = window.location.pathname + window.location.search;
          window.location.href = `/login?redirect=${encodeURIComponent(next)}`;
          return;
        }
        const { data, error: err } = await api.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (err || !data) {
          setError(LOAD_ERROR);
          return;
        }
        const immediate = data.redirect_url ?? data.redirect_to;
        // Destino devolvido pelo SDK para consentimento já concedido; não vem da URL da página.
        if (immediate && !data.client) {
          window.location.href = immediate;
          return;
        }
        if (!data.client) {
          setError(LOAD_ERROR);
          return;
        }
        setDetails(data);
      } catch {
        if (active) setError(LOAD_ERROR);
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    if (busy || !details || error) return;
    const api = oauthApi();
    if (!api) {
      setError(DECISION_ERROR);
      return;
    }
    setBusy(true);
    try {
      const { data, error: err } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (err || !target) {
        setError(DECISION_ERROR);
        return;
      }
      window.location.href = target;
    } catch {
      setError(DECISION_ERROR);
    } finally {
      setBusy(false);
    }
  }

  const clientName = details?.client?.name ?? "esta aplicação";
  const scopes = typeof details?.scope === "string"
    ? [...new Set(details.scope.split(/\s+/).filter(Boolean))]
    : [];

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
                ? "Confirme a aplicação e as permissões pedidas antes de autorizar."
                : "A carregar pedido de autorização…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p role="alert" className="text-sm text-muted-foreground">Pode fechar esta janela e voltar a tentar.</p>}
          {!error && !details && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> A carregar…
            </div>
          )}
          {!error && details && (
            <>
              <div className="space-y-2 text-sm break-words">
                <p><strong>Aplicação:</strong> {clientName}</p>
                <p className="font-medium">Permissões pedidas</p>
                {scopes.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {scopes.map(scope => (
                      <li key={scope}>{SCOPE_LABELS[scope] ?? scope}{SCOPE_LABELS[scope] && <span className="text-muted-foreground"> ({scope})</span>}</li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground">O pedido não indica permissões adicionais.</p>}
                <p className="text-muted-foreground">Esta autorização refere-se às permissões acima. Não concede novas permissões no CRM nem acesso a outros workspaces. Qualquer consulta no FastCRM continua sujeita às suas permissões e às regras de acesso.</p>
              </div>
              <div className="flex gap-3">
              <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Autorizar
              </Button>
              </div>
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
