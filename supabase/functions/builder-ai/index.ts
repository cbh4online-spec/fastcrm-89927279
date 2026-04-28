// Builder AI: text generation, refactor, A/B variants
// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_DEFAULT = "google/gemini-2.5-flash";

type Mode = "generate_page" | "generate_email" | "refactor" | "variants" | "translate";

interface ReqBody {
  mode: Mode;
  prompt?: string;
  selectionHtml?: string;
  fullHtml?: string;
  targetLang?: string;
  variants?: number; // for A/B
  model?: string;
  tone?: string; // persuasivo | profissional | casual | direto | entusiasta
  lang?: string; // pt | en | es | fr
}

const LANG_LABEL: Record<string, string> = {
  pt: "português de Portugal",
  en: "English",
  es: "español",
  fr: "français",
};

const SYSTEMS: Record<Mode, string> = {
  generate_page: `És um designer/copywriter sénior. Devolves UM ficheiro HTML completo (<!doctype html>...) com Tailwind via CDN para uma landing page profissional, responsiva. Usa hierarquia clara (hero, benefícios, prova social, CTA, FAQ, footer). NÃO incluas explicações, devolve apenas HTML.`,
  generate_email: `És um copywriter de email marketing sénior. Devolves UM HTML de email transacional/marketing inline-styled (sem <link>, sem JS), largura máx 600px, compatível com Gmail/Outlook. Devolve apenas HTML.`,
  refactor: `És um editor sénior de copy e HTML. Recebes um snippet HTML de um bloco e devolves uma versão melhorada conforme o pedido do utilizador.

REGRAS CRÍTICAS DE PRESERVAÇÃO DE LAYOUT:
- Mantém EXACTAMENTE a mesma tag root (div/section/h1/p/button/etc).
- Mantém TODAS as classes CSS / Tailwind do elemento root e dos filhos estruturais.
- Mantém a mesma estrutura de filhos (mesmas tags, mesma ordem) salvo se a instrução pedir o contrário explicitamente.
- Preserva atributos não-textuais: id, src, href, alt, data-*, aria-*, role, type, name, target, rel, style.
- Preserva o atributo data-bid em todos os elementos onde já existe.
- NÃO introduzas <script>, <style>, <link>, <meta>, <iframe> nem código executável.
- Altera apenas conteúdo de texto e, se a instrução pedir, microcópia de atributos visíveis (alt, title, placeholder, aria-label).
- Devolve APENAS o HTML refactorizado, sem markdown, sem comentários, sem explicação.`,
  variants: `És um copywriter de conversão. Recebes um snippet HTML e geras N variantes alternativas (mesma estrutura, copy diferente). Devolve um JSON com a forma {"variants":[{"label":"A","html":"..."},...]}. Sem markdown. Apenas JSON válido.`,
  translate: `És um tradutor profissional. Traduz o conteúdo de texto do HTML para o idioma indicado, preservando rigorosamente todas as tags, atributos e estrutura. Devolve apenas o HTML traduzido.`,
};

function buildUserMessage(b: ReqBody): string {
  const lang = LANG_LABEL[b.lang ?? "pt"] ?? "português de Portugal";
  const tone = b.tone ?? "persuasivo";
  switch (b.mode) {
    case "generate_page":
    case "generate_email":
      return `Idioma: ${lang}\nTom: ${tone}\n\nPedido: ${b.prompt ?? ""}`;
    case "refactor":
      return `Instrução: ${b.prompt ?? "Melhora este bloco"}\n\nHTML actual:\n${b.selectionHtml ?? b.fullHtml ?? ""}`;
    case "variants":
      return `Gera ${b.variants ?? 3} variantes. Instrução opcional: ${b.prompt ?? "—"}\n\nHTML base:\n${b.selectionHtml ?? b.fullHtml ?? ""}`;
    case "translate":
      return `Idioma alvo: ${b.targetLang ?? "en"}\n\nHTML:\n${b.selectionHtml ?? b.fullHtml ?? ""}`;
  }
}

function stripCodeFences(s: string): string {
  return s.replace(/^```(?:html|json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.mode || !SYSTEMS[body.mode]) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const model = body.model || MODEL_DEFAULT;
    const messages = [
      { role: "system", content: SYSTEMS[body.mode] },
      { role: "user", content: buildUserMessage(body) },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited", message: "Demasiados pedidos. Tenta novamente em alguns segundos." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "payment_required", message: "Créditos de IA esgotados. Adiciona créditos em Settings > Workspace > Usage." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error:", res.status, t);
      return new Response(JSON.stringify({ error: "ai_gateway_error", status: res.status, message: "Falha na geração de IA. Tenta novamente." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = stripCodeFences(raw);

    if (body.mode === "variants") {
      try {
        const parsed = JSON.parse(cleaned);
        return new Response(JSON.stringify({ ok: true, mode: body.mode, variants: parsed.variants ?? [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_variants_json", raw: cleaned }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, mode: body.mode, html: cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("builder-ai error:", e);
    return new Response(JSON.stringify({ error: "internal_error", message: e instanceof Error ? e.message : String(e) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
