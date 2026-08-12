import { logAIUsage } from "../_shared/ai-instrumentation.ts";

// ── AI usage logging helper (auto-injected) ───────────────────────────────────
async function __loggedAIFetch(
  workspaceId: string | null,
  feature: string,
  init: RequestInit
): Promise<Response> {
  const start = Date.now();
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const body = init.body ? JSON.parse(init.body as string) : {};
  const model = body.model || "google/gemini-3-flash-preview";
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    if (workspaceId) {
      logAIUsage({
        workspace_id: workspaceId,
        feature,
        model,
        tokens_input: 0,
        tokens_output: 0,
        latency_ms: Date.now() - start,
        was_error: true,
        error_type: "network",
      });
    }
    throw e;
  }

  if (!workspaceId) return response;

  const clone = response.clone();
  clone.json().then((data: any) => {
    const tokens_input = data?.usage?.prompt_tokens ?? 0;
    const tokens_output = data?.usage?.completion_tokens ?? 0;
    logAIUsage({
      workspace_id: workspaceId,
      feature,
      model,
      tokens_input,
      tokens_output,
      latency_ms: Date.now() - start,
      was_error: !response.ok,
      error_type: response.ok ? undefined : `http_${response.status}`,
    });
  }).catch(() => {});

  return response;
}

// Builder AI: text generation, refactor, A/B variants
// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_DEFAULT = "google/gemini-2.5-flash";
const MODEL_CHAT = "google/gemini-3.6-flash";

type Mode = "generate_page" | "generate_email" | "refactor" | "variants" | "translate" | "chat";

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
  assetType?: string;
  workspaceId?: string | null;
  history?: { role: "user" | "assistant"; content: string }[];
  stream?: boolean; // só válido em mode: "chat"
}

const CHAT_STREAM_SYSTEM = `És um engenheiro/designer sénior de landing pages, a trabalhar num editor visual estilo Lovable. O utilizador conversa contigo em linguagem natural e tu devolves o HTML actualizado, em STREAMING.

FORMATO OBRIGATÓRIO DA RESPOSTA:
1) A PRIMEIRA linha é exactamente: SUMMARY: <frase curta em português de Portugal a descrever o que mudaste>
2) A seguir, e até ao fim, apenas HTML puro. Sem JSON, sem markdown, sem code fences, sem explicações.

REGRAS:
- Se receberes "HTML DO BLOCO SELECCIONADO", devolves apenas esse bloco reescrito (mesma tag root, mesmo data-bid). Não devolvas a página inteira.
- Se não houver bloco seleccionado, devolves o documento HTML completo (<!doctype html>...) já com as alterações pedidas, preservando todo o conteúdo que o utilizador não pediu para alterar.
- Usa Tailwind via CDN quando criares algo de raiz; se a página já tiver um sistema de estilos, respeita-o.
- Preserva atributos data-bid, id, href, src, alt, aria-*, e imagens existentes salvo pedido explícito.
- Nunca incluas <script> de terceiros nem código de tracking.
- Design profissional, responsivo, acessível (contraste, alt, labels), copy em português de Portugal salvo indicação contrária.`;


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
  chat: `És um engenheiro/designer sénior de landing pages, a trabalhar num editor visual estilo Lovable. O utilizador conversa contigo em linguagem natural e tu devolves o HTML actualizado.

REGRAS:
- Devolves SEMPRE e APENAS JSON válido: {"summary":"frase curta em português de Portugal a descrever o que mudaste","html":"<...>"}
- Se receberes "HTML DO BLOCO SELECCIONADO", devolves apenas esse bloco reescrito (mesma tag root, mesmo data-bid). Não devolvas a página inteira.
- Se não houver bloco seleccionado, devolves o documento HTML completo (<!doctype html>...) já com as alterações pedidas, preservando todo o conteúdo que o utilizador não pediu para alterar.
- Usa Tailwind via CDN quando criares algo de raiz; se a página já tiver um sistema de estilos, respeita-o.
- Preserva atributos data-bid, id, href, src, alt, aria-*, e imagens existentes salvo pedido explícito.
- Nunca incluas <script> de terceiros nem código de tracking.
- Design profissional, responsivo, acessível (contraste, alt, labels), copy em português de Portugal salvo indicação contrária.
- Sem markdown, sem code fences, sem explicações fora do JSON.`,

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
    case "chat": {
      const parts = [`Tipo de asset: ${b.assetType ?? "landing"}`, `Idioma: ${lang}`, `Pedido do utilizador: ${b.prompt ?? ""}`];
      if (b.selectionHtml) {
        parts.push(`HTML DO BLOCO SELECCIONADO (edita só isto):\n${b.selectionHtml}`);
      } else {
        parts.push(`HTML ACTUAL DA PÁGINA (devolve a página completa actualizada):\n${b.fullHtml ?? "(vazio — cria de raiz)"}`);
      }
      return parts.join("\n\n");
    }

  }
}

function stripCodeFences(s: string): string {
  return s.replace(/^```(?:html|json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function splitSummaryAndHtml(text: string): { summary: string; html: string } {
  const cleaned = stripCodeFences(text.trim());
  const match = cleaned.match(/^\s*SUMMARY:\s*(.*?)\s*(?:\n|$)/i);
  if (match) {
    return { summary: match[1] || "Alteração aplicada.", html: stripCodeFences(cleaned.slice(match[0].length)) };
  }
  // Fallback: o modelo devolveu JSON ou HTML directo
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed?.html) {
      return { summary: String(parsed.summary ?? "Alteração aplicada."), html: stripCodeFences(String(parsed.html)) };
    }
  } catch { /* ignore */ }
  return { summary: "Alteração aplicada.", html: cleaned };
}

async function handleChatStream(args: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  body: ReqBody;
}): Promise<Response> {
  const { apiKey, model, messages, body } = args;
  const start = Date.now();

  const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  const sseError = (message: string, code: string) =>
    new Response(`event: error\ndata: ${JSON.stringify({ code, message })}\n\n`, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });

  if (upstream.status === 429) return sseError("Demasiados pedidos. Tenta novamente em alguns segundos.", "rate_limited");
  if (upstream.status === 402) return sseError("Créditos de IA esgotados. Adiciona créditos em Settings > Workspace > Usage.", "payment_required");
  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => "");
    console.error("AI gateway stream error:", upstream.status, t.slice(0, 500));
    return sseError("Falha na geração de IA. Tenta novamente.", "ai_gateway_error");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let acc = "";
  let usageIn = 0;
  let usageOut = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));

      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta: string = json?.choices?.[0]?.delta?.content ?? "";
              if (json?.usage) {
                usageIn = json.usage.prompt_tokens ?? usageIn;
                usageOut = json.usage.completion_tokens ?? usageOut;
              }
              if (delta) {
                acc += delta;
                send("delta", { text: delta });
              }
            } catch { /* chunk parcial — ignora */ }
          }
        }

        const { summary, html } = splitSummaryAndHtml(acc);
        if (!html) {
          send("error", { code: "invalid_chat_response", message: "A IA não devolveu HTML válido. Tenta reformular o pedido." });
        } else {
          send("done", { summary, html, scope: body.selectionHtml ? "selection" : "page" });
        }
      } catch (e) {
        console.error("builder-ai stream error:", e);
        send("error", { code: "stream_error", message: e instanceof Error ? e.message : "Erro no streaming" });
      } finally {
        if (body.workspaceId) {
          const workspaceId = body.workspaceId;
          logAIUsage({
            workspace_id: workspaceId,
            feature: "builder-ai",
            model,
            tokens_input: usageIn || Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4),
            tokens_output: usageOut || Math.ceil(acc.length / 4),
            latency_ms: Date.now() - start,
            was_error: false,
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
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

    const model = body.model || (body.mode === "chat" ? MODEL_CHAT : MODEL_DEFAULT);
    const history = (body.history ?? [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const wantsStream = body.mode === "chat" && body.stream === true;

    const messages = [
      { role: "system", content: wantsStream ? CHAT_STREAM_SYSTEM : SYSTEMS[body.mode] },
      ...history,
      { role: "user", content: buildUserMessage(body) },
    ];

    if (wantsStream) {
      return await handleChatStream({ apiKey: LOVABLE_API_KEY, model, messages, body });
    }


    const res = await __loggedAIFetch(body.workspaceId ?? null, "builder-ai", {
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

    if (body.mode === "chat") {
      // Esperado: {"summary": "...", "html": "..."}
      let summary = "";
      let outHtml = "";
      try {
        const parsed = JSON.parse(cleaned);
        summary = String(parsed.summary ?? "");
        outHtml = String(parsed.html ?? "");
      } catch {
        // fallback: o modelo devolveu HTML directo
        if (/^\s*</.test(cleaned)) {
          outHtml = cleaned;
          summary = "Alteração aplicada.";
        }
      }
      if (!outHtml) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_chat_response", message: "A IA não devolveu HTML válido. Tenta reformular o pedido.", raw: cleaned.slice(0, 500) }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, mode: "chat", summary, html: stripCodeFences(outHtml), scope: body.selectionHtml ? "selection" : "page" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
