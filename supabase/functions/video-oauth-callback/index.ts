import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error, url.searchParams.get("error_description"));
      return new Response(
        `<html><body><script>window.close(); alert("Erro na autorização: ${error}");</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (!code || !stateParam) {
      return new Response(
        `<html><body><script>window.close(); alert("Parâmetros em falta");</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Decode state
    let state: { workspace_id: string; provider: string; redirect_url: string };
    try {
      state = JSON.parse(atob(decodeURIComponent(stateParam)));
    } catch {
      return new Response(
        `<html><body><script>window.close(); alert("State inválido");</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const { workspace_id, provider, redirect_url } = state;
    const callbackUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/video-oauth-callback`;

    // Fetch workspace config to get client credentials
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: config, error: configError } = await adminClient
      .from("workspace_video_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .single();

    if (configError || !config) {
      console.error("Config not found:", configError);
      return redirectWithError(redirect_url, "Configuração não encontrada");
    }

    if (provider === "zoom") {
      const clientId = config.zoom_client_id;
      const clientSecret = config.zoom_client_secret_encrypted;

      if (!clientId || !clientSecret) {
        return redirectWithError(redirect_url, "Credenciais Zoom não encontradas");
      }

      // Exchange code for tokens
      const credentials = btoa(`${clientId}:${clientSecret}`);
      const tokenRes = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(callbackUri)}`,
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("Zoom token exchange failed:", err);
        return redirectWithError(redirect_url, "Falha ao obter token do Zoom");
      }

      const tokenData = await tokenRes.json();

      // Store tokens
      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
      await adminClient
        .from("workspace_video_config")
        .update({
          zoom_access_token: tokenData.access_token,
          zoom_refresh_token: tokenData.refresh_token,
          zoom_token_expires_at: expiresAt,
          zoom_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      return redirectWithSuccess(redirect_url, "zoom");
    }

    if (provider === "google_meet") {
      const clientId = config.google_client_id;
      const clientSecret = config.google_client_secret_encrypted;

      if (!clientId || !clientSecret) {
        return redirectWithError(redirect_url, "Credenciais Google não encontradas");
      }

      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUri,
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("Google token exchange failed:", err);
        return redirectWithError(redirect_url, "Falha ao obter token do Google");
      }

      const tokenData = await tokenRes.json();

      // Store tokens
      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
      await adminClient
        .from("workspace_video_config")
        .update({
          google_access_token: tokenData.access_token,
          google_refresh_token: tokenData.refresh_token,
          google_token_expires_at: expiresAt,
          google_meet_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      return redirectWithSuccess(redirect_url, "google_meet");
    }

    return redirectWithError(redirect_url, "Provider desconhecido");
  } catch (error) {
    console.error("video-oauth-callback error:", error);
    return new Response(
      `<html><body><h2>Erro interno</h2><p>${error.message}</p><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
});

function redirectWithSuccess(redirectUrl: string, provider: string): Response {
  const url = new URL(redirectUrl);
  url.searchParams.set("video_oauth", "success");
  url.searchParams.set("video_provider", provider);
  return Response.redirect(url.toString(), 302);
}

function redirectWithError(redirectUrl: string, message: string): Response {
  const url = new URL(redirectUrl);
  url.searchParams.set("video_oauth", "error");
  url.searchParams.set("video_error", message);
  return Response.redirect(url.toString(), 302);
}
