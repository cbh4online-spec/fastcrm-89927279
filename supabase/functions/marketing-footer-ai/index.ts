// Assistente de IA: gera rodapé legal (RGPD) e texto de cancelamento para emails do workspace.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const UUID_RE = /^[0-9a-f-]{36}$/i;
const TONES: Record<string, string> = {
  formal: "corporativo e formal",
  friendly: "próximo e amigável",
  minimal: "minimalista e muito curto",
};
const SECTORS = ["geral", "b2b_servicos", "clinica_bem_estar", "ecommerce", "associacao"];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "IA não configurada" }, 500);
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Sessão inválida" }, 401);
    const admin = createClient(url, service);
    const { data: { user } } = await admin.auth.getUser(auth.slice(7));
    if (!user) return json({ error: "Sessão inválida" }, 401);

    const body = await req.json().catch(() => ({}));
    const workspaceId = String(body.workspace_id ?? "");
    const tone = TONES[String(body.tone)] ? String(body.tone) : "formal";
    const sector = SECTORS.includes(String(body.sector)) ? String(body.sector) : "geral";
    const company = String(body.company ?? "").slice(0, 120);
    const nif = String(body.nif ?? "").slice(0, 20);
    const address = String(body.address ?? "").slice(0, 200);
    const reason = String(body.reason ?? "").slice(0, 200);
    const current = String(body.current ?? "").slice(0, 1500);
    if (!UUID_RE.test(workspaceId)) return json({ error: "Workspace em falta" }, 400);

    const { data: member } = await admin.from("workspace_members").select("user_id")
      .eq("workspace_id", workspaceId).eq("user_id", user.id).limit(1).maybeSingle();
    if (!member) return json({ error: "Sem acesso a este workspace" }, 403);

    const { data: ws } = await admin.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
    const name = company || ws?.name || "";

    const prompt = `Escreve em português de Portugal o rodapé de emails de marketing para a empresa "${name}".
Setor: ${sector}. Tom: ${TONES[tone]}.
NIF: ${nif || "não indicado"}. Morada: ${address || "não indicada"}. Motivo de receção: ${reason || "não indicado"}.
${current ? `Rodapé atual a melhorar:\n${current}\n` : ""}
Regras: cumprir RGPD e Lei n.º 41/2004 (comunicações eletrónicas); identificar o remetente; explicar porque recebe o email; frase cordial de cancelamento que reduza denúncias de spam. NÃO incluas links nem URLs (o link de cancelamento é inserido automaticamente pelo sistema). Não inventes NIF nem morada: se faltarem, usa [NIF] e [Morada].
Responde APENAS com JSON: {"footer": string (máx. 600 caracteres, linhas separadas por \\n), "unsubscribe_text": string (1 frase, máx. 160), "tips": string[] (até 3 recomendações curtas)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "Authorization": `Bearer ${apiKey}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      const msg = res.status === 402 ? "Créditos de IA esgotados" : res.status === 429 ? "Demasiados pedidos, tente daqui a pouco" : "Falha na IA";
      console.error("ai error", res.status, t.slice(0, 300));
      return json({ error: msg }, res.status === 402 || res.status === 429 ? res.status : 502);
    }

    // Consumir SSE e acumular o texto final
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const d = l.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        } catch { /* ignorar */ }
      }
    }
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "A IA não devolveu sugestão" }, 502);
    const out = JSON.parse(m[0]);
    const strip = (s: unknown, n: number) => String(s ?? "").replace(/https?:\/\/\S+/g, "").slice(0, n).trim();
    return json({
      footer: strip(out.footer, 600),
      unsubscribe_text: strip(out.unsubscribe_text, 160),
      tips: Array.isArray(out.tips) ? out.tips.slice(0, 3).map((t: unknown) => strip(t, 200)) : [],
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro interno" }, 500);
  }
});
