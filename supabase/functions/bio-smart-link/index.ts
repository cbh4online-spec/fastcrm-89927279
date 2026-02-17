import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchPageMeta(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FastCRM/1.0)" },
      redirect: "follow",
    });
    const html = await res.text();
    const getTag = (name: string) => {
      const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i"));
      return m?.[1] || "";
    };
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return {
      title: getTag("og:title") || titleMatch?.[1] || "",
      description: getTag("og:description") || getTag("description") || "",
      image: getTag("og:image") || "",
    };
  } catch (e) {
    console.error("Failed to fetch page meta:", e);
    return { title: "", description: "", image: "" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { url, blockType, workspaceId } = await req.json();
    if (!url || !workspaceId) {
      return new Response(JSON.stringify({ error: "url and workspaceId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch page metadata
    const meta = await fetchPageMeta(url);
    console.log("Page meta:", meta);

    // 2. Generate persuasive copy with Gemini 3 Flash
    const copyPrompt = `Analisa este URL e os seus metadados para gerar copy persuasivo para um bloco "${blockType}" numa página "link in bio".

URL: ${url}
Título da página: ${meta.title}
Descrição: ${meta.description}

Gera um JSON com exactamente estes campos:
- "title": identifica a DOR ou PROBLEMA principal do público-alvo (max 8 palavras), usa a framework PAS (Problema-Agitação-Solução) — começa sempre pelo problema/frustração real do visitante. Exemplos: "Cansado de perder clientes?", "Sem tempo para gerir redes sociais?"
- "subtitle": apresenta a SOLUÇÃO e o BENEFÍCIO concreto (max 15 palavras), mostra como o produto/serviço resolve a dor identificada no título
- "cta_text": texto do botão CTA (max 3 palavras), cria urgência ou curiosidade

Regras:
- Usa português de Portugal (PT-PT)
- O título DEVE tocar numa dor real — nunca ser genérico ou apenas "chamativo"
- O subtítulo DEVE ser a solução directa para a dor do título
- Evita clichés como "Clique aqui" ou "Saiba mais"
- O CTA deve criar desejo de acção imediata
- Adapta o tom ao conteúdo real da página

Responde APENAS com o JSON, sem markdown.`;

    const copyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: copyPrompt }],
      }),
    });

    if (!copyResponse.ok) {
      const errText = await copyResponse.text();
      console.error("Copy AI error:", copyResponse.status, errText);
      throw new Error(`Copy AI error: ${copyResponse.status}`);
    }

    const copyData = await copyResponse.json();
    const rawCopy = copyData.choices?.[0]?.message?.content || "{}";
    // Strip markdown fences if present
    const cleanJson = rawCopy.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    let copy: { title: string; subtitle: string; cta_text: string };
    try {
      copy = JSON.parse(cleanJson);
    } catch {
      console.error("Failed to parse copy JSON:", cleanJson);
      copy = { title: meta.title || "Descubra Agora", subtitle: meta.description || "Algo incrível espera por si", cta_text: "Ver Agora" };
    }

    const result: Record<string, string> = {
      title: copy.title,
      subtitle: copy.subtitle,
      cta_text: copy.cta_text,
      cta_url: url,
    };

    // 3. Generate background image for hero/feature blocks
    if (blockType === "hero" || blockType === "feature") {
      try {
        const imagePrompt = `Create a professional background image that visually represents this business/page:
Page: ${meta.title}
Description: ${meta.description}
Theme: ${copy.title} - ${copy.subtitle}
URL context: ${url}

The image must:
- Visually communicate the industry/niche of this page (e.g. food imagery for restaurants, tech visuals for software, beauty aesthetics for salons, fitness for gyms)
- Use a modern, premium aesthetic with subtle depth
- Work as a background with text overlay (include slightly dark or blurred areas for readability)
- NO text, NO logos, NO watermarks
- Photorealistic or high-quality illustration style
- Convey the emotion and value proposition of the page
- Ultra high resolution, 16:9 aspect ratio`;

        const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (imgResponse.ok) {
          const imgData = await imgResponse.json();
          const imgUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (imgUrl) {
            const base64Match = imgUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
            if (base64Match) {
              const mimeType = base64Match[1];
              const base64Data = base64Match[2];
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              const supabaseAdmin = createClient(
                Deno.env.get("SUPABASE_URL")!,
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
              );

              const ext = mimeType === "jpeg" ? "jpg" : mimeType;
              const filePath = `${workspaceId}/smart-${Date.now()}.${ext}`;
              const { error: uploadError } = await supabaseAdmin.storage
                .from("bio-assets")
                .upload(filePath, bytes, { contentType: `image/${mimeType}`, upsert: true });

              if (!uploadError) {
                const { data: { publicUrl } } = supabaseAdmin.storage
                  .from("bio-assets")
                  .getPublicUrl(filePath);
                result.bg_image = publicUrl;
              } else {
                console.error("Upload error:", uploadError);
              }
            }
          }
        } else {
          console.error("Image AI error:", imgResponse.status);
        }
      } catch (imgErr) {
        console.error("Image generation failed (non-blocking):", imgErr);
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bio-smart-link error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
