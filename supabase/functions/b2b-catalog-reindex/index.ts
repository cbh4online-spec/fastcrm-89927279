// b2b-catalog-reindex
// Gera um documento por produto na KB do catálogo B2B,
// chunka o conteúdo, insere em knowledge_chunks e marca
// products.indexed_for_copilot_at = now().
//
// Body:
//   { workspace_id: string, product_ids?: string[], force?: boolean, max_products?: number }
//
// - Se product_ids vier preenchido, reindexa apenas esses.
// - Caso contrário, reindexa produtos b2b_published=true cuja indexed_for_copilot_at
//   esteja a NULL ou seja anterior a updated_at (até max_products, default 50).
// - force=true ignora o filtro de "está atualizado" e reindexa de qualquer forma.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHUNK_SIZE = 900; // chars
const CHUNK_OVERLAP = 120;
const DEFAULT_MAX_PRODUCTS = 50;

interface ReindexBody {
  workspace_id?: string;
  product_ids?: string[];
  force?: boolean;
  max_products?: number;
}

interface ProductRow {
  id: string;
  workspace_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  short_description: string | null;
  base_price: number | null;
  currency: string | null;
  brand_logo_url: string | null;
  tags: string[] | null;
  search_keywords: string | null;
  updated_at: string;
  b2b_published: boolean | null;
}

function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + size, clean.length);
    let slice = clean.slice(start, end);
    // tenta cortar num espaço para não partir palavras a meio
    if (end < clean.length) {
      const lastSpace = slice.lastIndexOf(" ");
      if (lastSpace > size * 0.6) slice = slice.slice(0, lastSpace);
    }
    chunks.push(slice.trim());
    start += slice.length - overlap;
    if (start < 0) start = 0;
    if (slice.length <= overlap) break; // safety
  }
  return chunks.filter(Boolean);
}

function fmtPrice(p: number | null, c: string | null): string {
  if (p == null) return "—";
  const cur = c || "EUR";
  try {
    return new Intl.NumberFormat("pt-PT", { style: "currency", currency: cur }).format(p);
  } catch {
    return `${p} ${cur}`;
  }
}

function buildDocument(product: ProductRow, sections: any[]): { title: string; body: string } {
  const lines: string[] = [];
  lines.push(`# ${product.name}`);
  if (product.sku) lines.push(`SKU: ${product.sku}`);
  if (product.category) lines.push(`Categoria: ${product.category}`);
  lines.push(`Preço base: ${fmtPrice(product.base_price, product.currency)}`);
  if (product.tags?.length) lines.push(`Tags: ${product.tags.join(", ")}`);
  if (product.search_keywords) lines.push(`Palavras-chave: ${product.search_keywords}`);
  if (product.short_description) {
    lines.push("");
    lines.push("## Descrição curta");
    lines.push(product.short_description);
  }

  const sectionLabels: Record<string, string> = {
    overview: "Visão Geral",
    how_to_use: "Como Usar",
    specifications: "Especificações",
    clinical: "Clínico",
  };

  for (const s of sections) {
    const label = sectionLabels[s.section_key] ?? s.section_key;
    lines.push("");
    lines.push(`## ${label}`);
    if (s.body_markdown) lines.push(String(s.body_markdown));
    if (s.attributes && typeof s.attributes === "object") {
      for (const [k, v] of Object.entries(s.attributes)) {
        if (v == null || v === "") continue;
        const valueStr = Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
        lines.push(`- **${k}**: ${valueStr}`);
      }
    }
  }

  return { title: product.name, body: lines.join("\n") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: ReindexBody = {};
  try {
    body = (await req.json()) as ReindexBody;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const workspaceId = body.workspace_id;
  if (!workspaceId) {
    return new Response(JSON.stringify({ error: "workspace_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth: extrair user a partir do JWT (se presente)
  let userId: string | null = null;
  try {
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(auth.slice(7));
      userId = data.user?.id ?? null;
    }
  } catch { /* anonymous / service-role */ }

  try {
    // 1) Garantir KB do catálogo
    const { data: kbId, error: kbErr } = await supabase.rpc("ensure_b2b_catalog_kb", {
      p_workspace_id: workspaceId,
      p_user_id: userId,
    });
    if (kbErr) throw kbErr;
    if (!kbId) throw new Error("ensure_b2b_catalog_kb returned null");

    // 2) Selecionar produtos
    const max = Math.max(1, Math.min(body.max_products ?? DEFAULT_MAX_PRODUCTS, 200));
    let productsQuery = supabase
      .from("products")
      .select("id, workspace_id, name, sku, category, short_description, base_price, currency, brand_logo_url, tags, search_keywords, updated_at, b2b_published, indexed_for_copilot_at")
      .eq("workspace_id", workspaceId);

    if (body.product_ids?.length) {
      productsQuery = productsQuery.in("id", body.product_ids);
    } else {
      productsQuery = productsQuery.eq("b2b_published", true).limit(max);
    }

    const { data: products, error: prodErr } = await productsQuery;
    if (prodErr) throw prodErr;

    let processed = 0;
    let chunksInserted = 0;
    const skipped: string[] = [];
    const errors: { product_id: string; error: string }[] = [];

    for (const p of (products ?? []) as Array<ProductRow & { indexed_for_copilot_at: string | null }>) {
      try {
        // Filtro "atualizado" (apenas em modo bulk sem force)
        if (!body.product_ids?.length && !body.force) {
          const idx = p.indexed_for_copilot_at;
          if (idx && new Date(idx) >= new Date(p.updated_at)) {
            skipped.push(p.id);
            continue;
          }
        }

        // 3) Buscar secções de conteúdo
        const { data: sections } = await supabase
          .from("product_content_sections")
          .select("section_key, body_markdown, attributes")
          .eq("product_id", p.id)
          .eq("locale", "pt-PT");

        const { title, body: docBody } = buildDocument(p, sections ?? []);

        // 4) Upsert do documento (1 por produto): chave lógica = metadata.product_id
        const docName = `Produto: ${title}${p.sku ? ` [${p.sku}]` : ""}`;
        const { data: existingDoc } = await supabase
          .from("knowledge_documents")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("knowledge_base_id", kbId)
          .contains("metadata", { product_id: p.id })
          .limit(1)
          .maybeSingle();

        let documentId: string;
        if (existingDoc?.id) {
          documentId = existingDoc.id;
          await supabase
            .from("knowledge_documents")
            .update({
              name: docName,
              raw_text: docBody,
              status: "embedding",
              error_message: null,
              file_type: "product",
              metadata: { product_id: p.id, sku: p.sku, source: "b2b-catalog-reindex" },
            })
            .eq("id", documentId);

          // limpa chunks antigos (CASCADE não, pois não removemos o doc)
          await supabase.from("knowledge_chunks").delete().eq("document_id", documentId);
        } else {
          const { data: newDoc, error: insErr } = await supabase
            .from("knowledge_documents")
            .insert({
              workspace_id: workspaceId,
              knowledge_base_id: kbId,
              name: docName,
              raw_text: docBody,
              file_type: "product",
              status: "embedding",
              created_by: userId,
              metadata: { product_id: p.id, sku: p.sku, source: "b2b-catalog-reindex" },
            })
            .select("id")
            .single();
          if (insErr) throw insErr;
          documentId = newDoc!.id;
        }

        // 5) Chunks
        const chunks = chunkText(docBody);
        if (chunks.length === 0) {
          await supabase
            .from("knowledge_documents")
            .update({ status: "ready", chunk_count: 0 })
            .eq("id", documentId);
        } else {
          const rows = chunks.map((content, idx) => ({
            workspace_id: workspaceId,
            knowledge_base_id: kbId,
            document_id: documentId,
            content,
            chunk_index: idx,
            token_count: Math.ceil(content.length / 4),
            metadata: { product_id: p.id, sku: p.sku, name: p.name },
          }));
          const { error: chunkErr } = await supabase.from("knowledge_chunks").insert(rows);
          if (chunkErr) throw chunkErr;
          chunksInserted += rows.length;

          // 6) Disparar embeddings (fire-and-forget)
          supabase.functions
            .invoke("knowledge-embedding", {
              body: { document_id: documentId, workspace_id: workspaceId },
            })
            .catch((e) => console.warn("[b2b-catalog-reindex] embedding invoke failed", e));
        }

        // 7) Marcar produto como indexado
        await supabase
          .from("products")
          .update({ indexed_for_copilot_at: new Date().toISOString() })
          .eq("id", p.id);

        processed++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[b2b-catalog-reindex] product ${p.id} failed:`, msg);
        errors.push({ product_id: p.id, error: msg });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        kb_id: kbId,
        processed,
        skipped: skipped.length,
        chunks_inserted: chunksInserted,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[b2b-catalog-reindex] fatal:", msg);
    // 200 OK + fallback (padrão do projeto para não rebentar o frontend)
    return new Response(
      JSON.stringify({ success: false, fallback: true, internal_error: msg, processed: 0, chunks_inserted: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
