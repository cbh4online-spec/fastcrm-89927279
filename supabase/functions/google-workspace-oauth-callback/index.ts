// Google OAuth callback — exchanges code for tokens and stores them per workspace+service.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function htmlResponse(message: string, ok: boolean, redirectTo?: string) {
  const safeMsg = message.replace(/</g, "&lt;");
  const safeRedirect = (redirectTo || "/settings/integrations").replace(/[^a-zA-Z0-9/_\-?=&.:]/g, "");
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Google</title>
<style>body{font-family:system-ui;background:#0b1220;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}.card{max-width:420px;padding:32px;border-radius:12px;background:#111827;border:1px solid #1f2937;text-align:center}.ok{color:#34d399}.err{color:#f87171}</style>
</head><body><div class="card"><h2 class="${ok ? "ok" : "err"}">${ok ? "✅ Conta Google ligada" : "❌ Erro ao ligar"}</h2><p>${safeMsg}</p><p><a style="color:#60a5fa" href="${safeRedirect}">Voltar às definições</a></p><script>
try{if(window.opener){window.opener.postMessage({type:'google-oauth-${ok ? "success" : "error"}',message:${JSON.stringify(message)}},'*');setTimeout(()=>window.close(),1200);}else{setTimeout(()=>{location.href=${JSON.stringify(safeRedirect)}},1500);}}catch(e){}
</script></div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return htmlResponse(`Google devolveu erro: ${error}`, false);
  if (!code || !stateRaw) return htmlResponse("Faltam parâmetros code/state", false);

  let state: { w: string; s: string; u: string; r?: string; t: number };
  try {
    state = JSON.parse(atob(stateRaw));
  } catch {
    return htmlResponse("State inválido", false);
  }

  if (!state.w || !state.s || !state.u) return htmlResponse("State incompleto", false);
  if (Date.now() - state.t > 10 * 60 * 1000) return htmlResponse("Sessão OAuth expirada", false);

  try {
    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/google-workspace-oauth-callback`;

    // Exchange code
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("[google-oauth-callback] token exchange failed", tokens);
      return htmlResponse(tokens.error_description || tokens.error || "Falha na troca do código", false);
    }

    // Get email/userinfo
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
    const scopes: string[] = (tokens.scope ?? "").split(" ").filter(Boolean);

    const { error: upsertErr } = await admin
      .from("workspace_google_connections")
      .upsert(
        {
          workspace_id: state.w,
          service: state.s,
          google_email: userInfo.email ?? null,
          google_user_id: userInfo.id ?? null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_expires_at: expiresAt,
          scopes,
          is_active: true,
          last_error: null,
          connected_by: state.u,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,service" },
      );

    if (upsertErr) {
      console.error("[google-oauth-callback] upsert failed", upsertErr);
      return htmlResponse(`Falha ao guardar ligação: ${upsertErr.message}`, false, state.r);
    }

    return htmlResponse(
      `Conta ${userInfo.email ?? "Google"} ligada para o serviço ${state.s}.`,
      true,
      state.r,
    );
  } catch (e) {
    console.error("[google-oauth-callback]", e);
    return htmlResponse((e as Error).message, false, state?.r);
  }
});
