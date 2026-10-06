import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({
  question: z.string().trim().min(1).max(2000),
  workspace_id: z.string().uuid(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(10).optional(),
});

const iso = (d: Date) => d.toISOString();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Sessão inválida. Volte a entrar." }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Pedido inválido." }, 400);
    const { question, workspace_id, history = [] } = parsed.data;

    // User-scoped client: RLS guarantees workspace isolation.
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u, error: ue } = await sb.auth.getUser();
    if (ue || !u?.user) return json({ error: "Sessão inválida. Volte a entrar." }, 401);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const staleCut = new Date(now.getTime() - 7 * 864e5);

    const [inv, leads, staleLeads, opps] = await Promise.all([
      sb.from("invoices").select("client_name,total,amount_paid,status,issue_date,document_type")
        .eq("workspace_id", workspace_id).gte("issue_date", iso(monthStart).slice(0, 10) < iso(weekAgo).slice(0, 10) ? iso(monthStart).slice(0, 10) : iso(weekAgo).slice(0, 10))
        .order("issue_date", { ascending: false }).limit(300),
      sb.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspace_id),
      sb.from("leads").select("name,status,last_contact_at,estimated_value").eq("workspace_id", workspace_id)
        .lt("last_contact_at", iso(staleCut)).order("last_contact_at", { ascending: true }).limit(15),
      sb.from("opportunities").select("value,status,probability,expected_close_date").eq("workspace_id", workspace_id).limit(500),
    ]);

    const valid = (inv.data ?? []).filter((i) => !["cancelled", "draft"].includes(String(i.status)) && i.document_type !== "proforma");
    const sum = (arr: typeof valid, k: "total" | "amount_paid") => arr.reduce((s, i) => s + Number(i[k] ?? 0), 0);
    const wk = valid.filter((i) => i.issue_date && new Date(i.issue_date) >= weekAgo);
    const mo = valid.filter((i) => i.issue_date && new Date(i.issue_date) >= monthStart);
    const openOpps = (opps.data ?? []).filter((o) => !["won", "lost", "closed"].includes(String(o.status)));
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const forecastOpps = openOpps.filter((o) => o.expected_close_date && new Date(o.expected_close_date) <= monthEnd);

    const r2 = (n: number) => Math.round(n * 100) / 100;
    const context = {
      data_hoje: iso(now).slice(0, 10),
      vendas_ultimos_7_dias: { documentos: wk.length, total_faturado: r2(sum(wk, "total")), recebido: r2(sum(wk, "amount_paid")),
        top: wk.slice(0, 10).map((i) => ({ cliente: i.client_name, total: i.total, estado: i.status, data: i.issue_date })) },
      vendas_mes_atual: { documentos: mo.length, total_faturado: r2(sum(mo, "total")), recebido: r2(sum(mo, "amount_paid")) },
      leads_total: leads.count ?? 0,
      leads_sem_contacto_7_dias: (staleLeads.data ?? []).map((l) => ({ nome: l.name, estado: l.status, ultimo_contacto: l.last_contact_at, valor: l.estimated_value })),
      pipeline_aberto: { oportunidades: openOpps.length, valor: r2(openOpps.reduce((s, o) => s + Number(o.value ?? 0), 0)) },
      forecast_mes: { oportunidades: forecastOpps.length,
        valor_ponderado: r2(forecastOpps.reduce((s, o) => s + Number(o.value ?? 0) * (Number(o.probability ?? 0) / 100), 0)) },
    };

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Assistente IA não configurado." }, 500);

    const input = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: `Dados reais do workspace (JSON):\n${JSON.stringify(context)}\n\nPergunta: ${question}` },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: "És o FastCRM Copilot. Responde sempre em português de Portugal, de forma curta e prática (máx. 8 linhas, listas quando útil). Usa APENAS os dados fornecidos; nunca inventes números. Se faltar informação, diz claramente. Valores em euros (formato 1 234,56 €). Se perguntarem o que consegues fazer, explica: resumo de vendas da semana/mês, leads paradas, pipeline e forecast do mês.",
        input,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t.slice(0, 500));
      if (res.status === 429) return json({ error: "Muitos pedidos ao assistente. Tente daqui a pouco." });
      if (res.status === 402) return json({ error: "Créditos IA esgotados. Adicione créditos para continuar." });
      return json({ error: "O assistente está temporariamente indisponível." });
    }

    // Consume SSE stream server-side.
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "", answer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const p = line.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") answer += ev.delta;
        } catch { /* ignore */ }
      }
    }
    if (!answer.trim()) return json({ error: "O assistente não devolveu resposta. Tente novamente." });
    return json({ answer: answer.trim() });
  } catch (e) {
    console.error("copilot-chat error", e);
    return json({ error: "Ocorreu um erro inesperado." });
  }
});
