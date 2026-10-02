// Envio de teste do editor de email, via Resend, com o remetente do workspace.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resendFetch } from "../_shared/resendGateway.ts";
import { resolveSenderDefaults } from "../_shared/senderAddress.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Sessão inválida" }, 401);
    const admin = createClient(url, service);
    const { data: { user } } = await admin.auth.getUser(auth.slice(7));
    if (!user) return json({ error: "Sessão inválida" }, 401);

    const body = await req.json().catch(() => ({}));
    const recipients: string[] = Array.isArray(body.recipients) ? body.recipients.map((e: string) => String(e).trim()) : [];
    const subject = String(body.subject ?? "").slice(0, 200);
    const html = String(body.html ?? "");
    const workspaceId = String(body.workspace_id ?? "");
    if (!recipients.length || !subject || !html) return json({ error: "Destinatários, assunto e conteúdo são obrigatórios" }, 400);
    if (recipients.length > 5 || recipients.some((e) => !EMAIL_RE.test(e))) return json({ error: "Até 5 emails válidos" }, 400);
    if (!UUID_RE.test(workspaceId)) return json({ error: "Workspace em falta" }, 400);

    const { data: member } = await admin.from("workspace_members").select("user_id")
      .eq("workspace_id", workspaceId).eq("user_id", user.id).limit(1).maybeSingle();
    if (!member) return json({ error: "Sem acesso a este workspace" }, 403);

    const sender = await resolveSenderDefaults(admin, workspaceId);
    const from = `${sender.fromName || "FastCRM"} <${sender.email}>`;
    const results: { email: string; success: boolean; error?: string; id?: string }[] = [];

    for (const to of recipients) {
      const res = await resendFetch("/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject: `[TESTE] ${subject}`, html, reply_to: sender.replyTo || undefined }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`test-send [${res.status}] ${to}: ${text}`);
        let msg = text;
        try { msg = JSON.parse(text)?.message || text; } catch { /* texto simples */ }
        results.push({ email: to, success: false, error: msg });
      } else {
        results.push({ email: to, success: true, id: JSON.parse(text)?.id });
      }
    }

    const sent = results.filter((r) => r.success).length;
    if (sent === 0) return json({ error: `Não enviado: ${results[0]?.error ?? "erro desconhecido"}`, from, results });
    return json({ success: true, sent, total: recipients.length, from, results });
  } catch (e) {
    console.error("email-builder-test-send error", e);
    return json({ error: "Erro interno ao enviar o teste" });
  }
});
