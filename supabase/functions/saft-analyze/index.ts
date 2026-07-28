import { createClient } from "npm:@supabase/supabase-js@2";
import { streamSaftXml, decodeStream, detectEncoding } from "../_shared/saft-stream-parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function canAccessWorkspace(admin: any, workspaceId: string, userId: string) {
  const { data: direct } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (direct) return true;

  const { data: workspace } = await admin
    .from("workspaces")
    .select("managed_by_workspace_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!workspace?.managed_by_workspace_id) return false;

  const { data: managerMember } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspace.managed_by_workspace_id)
    .eq("user_id", userId)
    .in("role", ["owner", "admin"])
    .maybeSingle();
  return !!managerMember;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return ok({ ok: false, error: "missing auth" }, 200);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return ok({ ok: false, error: "unauthorized" }, 200);

    const { import_id } = await req.json();
    if (!import_id) return ok({ ok: false, error: "import_id required" }, 200);

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: imp, error: impErr } = await admin
      .from("saft_imports")
      .select("*")
      .eq("id", import_id)
      .maybeSingle();
    if (impErr || !imp) return ok({ ok: false, error: "import not found" }, 200);

    const allowed = await canAccessWorkspace(admin, imp.workspace_id, user.id);
    if (!allowed) return ok({ ok: false, error: "Sem permissão para analisar SAF-T neste workspace" }, 200);

    // Hard guard: worker memory ~256MB. A 25MB XML already balloons past that
    // once decoded to a JS string + parsed AST. Reject early with a friendly msg.
    const MAX_BYTES = 25 * 1024 * 1024;
    if (typeof imp.file_size === "number" && imp.file_size > MAX_BYTES) {
      await admin.from("saft_imports").update({
        status: "failed",
        error_message: `Ficheiro demasiado grande (${(imp.file_size / 1024 / 1024).toFixed(1)} MB). Exporte o SAF-T por períodos mais curtos (mensal/trimestral, máx. 25 MB por ficheiro).`,
      }).eq("id", import_id);
      return ok({ ok: false, error: "file_too_large", max_mb: 25 }, 200);
    }

    const correlationId = crypto.randomUUID();
    const t0 = Date.now();

    // Step tracker: persists progress + structured log so failures can be diagnosed
    // (especially WORKER_RESOURCE_LIMIT, where the function dies mid-step with no JS error).
    const logStep = async (
      step: string,
      extra: Record<string, unknown> = {},
    ) => {
      const ts = new Date().toISOString();
      const elapsed_ms = Date.now() - t0;
      // @ts-ignore Deno provides memoryUsage in edge runtime
      const mem = typeof Deno.memoryUsage === "function" ? Deno.memoryUsage() : null;
      const entry = {
        step,
        ts,
        elapsed_ms,
        rss_mb: mem ? Math.round(mem.rss / 1024 / 1024) : null,
        heap_mb: mem ? Math.round(mem.heapUsed / 1024 / 1024) : null,
        ...extra,
      };
      console.log(`[saft-analyze][${correlationId}][${import_id}] ${step}`, JSON.stringify(entry));
      try {
        await admin.rpc("saft_imports_append_log", { p_id: import_id, p_step: step, p_entry: entry });
      } catch {
        // Fallback: best-effort partial update without the array append
        await admin.from("saft_imports")
          .update({ last_step: step, last_step_at: ts })
          .eq("id", import_id);
      }
    };

    const failAt = async (step: string, message: string) => {
      console.error(`[saft-analyze][${correlationId}][${import_id}] FAIL@${step}: ${message}`);
      await admin.from("saft_imports").update({
        status: "failed",
        error_message: message,
        last_error_step: step,
        last_step: step,
        last_step_at: new Date().toISOString(),
      }).eq("id", import_id);
    };

    await admin.from("saft_imports").update({
      status: "analyzing",
      started_at: new Date().toISOString(),
      completed_at: null,
      error_message: null,
      last_error_step: null,
      last_step: null,
      last_step_at: new Date().toISOString(),
      stats: {},
      debug_log: [],
    }).eq("id", import_id);
    await logStep("analyze_started", { file_size: imp.file_size, correlation_id: correlationId });

    // Para ficheiros até 25MB fazemos a análise no próprio pedido. Assim evitamos
    // que o runtime termine uma tarefa em background sem propagar erro à UI.
    const runAnalysis = async () => {
      try {
        await logStep("download_start");
        const { data: file, error: dlErr } = await admin.storage.from("saft-imports").download(imp.storage_path);
        if (dlErr || !file) {
          await failAt("download", dlErr?.message ?? "download failed");
          return;
        }
        await logStep("download_done", { downloaded_bytes: file.size });

        if (file.size > MAX_BYTES) {
          await failAt(
            "size_check",
            `Ficheiro demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Divida o SAF-T em períodos mais curtos (máx. 25 MB).`,
          );
          return;
        }

        // Leitura incremental: nunca carregamos o XML inteiro nem a árvore em memória.
        await logStep("decode_start");
        const headBytes = new Uint8Array(await file.slice(0, 200).arrayBuffer());
        const useEnc = detectEncoding(headBytes);
        await logStep("decode_done", { encoding: useEnc });

        await logStep("parse_xml_start");
        const invoiceNos: string[] = [];
        const stats = {
          customers: 0,
          products: 0,
          invoices: 0,
          invoice_lines: 0,
          payments: 0,
          total_gross: 0,
          total_net: 0,
          total_tax: 0,
          cancelled: 0,
        };
        const { header } = await streamSaftXml(
          decodeStream(file.stream(), useEnc),
          {
            onCustomer: () => { stats.customers++; },
            onProduct: () => { stats.products++; },
            onInvoice: (inv) => {
              stats.invoices++;
              stats.invoice_lines += (inv as any).line_count ?? inv.lines.length;
              stats.total_gross += inv.gross_total;
              stats.total_net += inv.net_total;
              stats.total_tax += inv.tax_payable;
              if (inv.invoice_status === "A") stats.cancelled++;
              if (inv.invoice_no) invoiceNos.push(inv.invoice_no);
            },
            onPayment: () => { stats.payments++; },
            includeInvoiceLines: false,
            progressEvery: 500,
            onProgress: async (c) => {
              if (Date.now() - t0 > 110_000) {
                throw new Error("Tempo limite excedido durante a leitura do SAF-T. Tente novamente ou divida o ficheiro por períodos mais curtos.");
              }
              await admin.from("saft_imports")
                .update({ last_step: "parse_xml_progress", last_step_at: new Date().toISOString(), stats: { ...stats, progress: c } })
                .eq("id", import_id);
            },
          },
        );
        if (!header) {
          await failAt("parse_xml", "Não é um SAF-T válido (Header não encontrado)");
          return;
        }
        await logStep("parse_xml_done", {
          invoices: stats.invoices,
          customers: stats.customers,
          products: stats.products,
        });

        await logStep("dedupe_check_start", { invoice_count: invoiceNos.length });
        let existingInvoices = 0;
        if (invoiceNos.length) {
          // Chunk IN() para evitar URLs gigantes em SAF-T anuais
          const CHUNK = 500;
          for (let i = 0; i < invoiceNos.length; i += CHUNK) {
            const slice = invoiceNos.slice(i, i + CHUNK);
            const { count, error: cErr } = await admin
              .from("invoices")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", imp.workspace_id)
              .in("saft_invoice_no", slice);
            if (cErr) {
              await failAt("dedupe_check", `dedupe query failed at chunk ${i}: ${cErr.message}`);
              return;
            }
            existingInvoices += count ?? 0;
            if (i % 2500 === 0) {
              await admin.from("saft_imports")
                .update({ last_step: "dedupe_check", last_step_at: new Date().toISOString() })
                .eq("id", import_id);
            }
          }
        }
        await logStep("dedupe_check_done", { existing: existingInvoices });

        const fullStats = {
          ...stats,
          existing_invoices: existingInvoices,
          new_invoices: stats.invoices - existingInvoices,
        };

        await logStep("persist_preview_start");
        const { error: upErr } = await admin.from("saft_imports").update({
          status: "preview_ready",
          saft_type: header.saft_type,
          saft_version: header.saft_version,
          software_company: header.software_company,
          software_id: header.software_id,
          tax_registration_number: header.tax_registration_number,
          fiscal_year: header.fiscal_year,
          period_start: header.period_start,
          period_end: header.period_end,
          stats: fullStats,
          completed_at: null,
        }).eq("id", import_id);

        if (upErr) {
          await failAt("persist_preview", upErr.message);
          return;
        }
        await logStep("analyze_completed", { total_ms: Date.now() - t0 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "parse error";
        const stack = e instanceof Error ? e.stack : undefined;
        console.error(`[saft-analyze:bg][${correlationId}][${import_id}] error`, msg, stack);
        await failAt("unhandled_exception", msg);
      }
    };

    await runAnalysis();

    return ok({ ok: true, queued: false, import_id, correlation_id: correlationId });
  } catch (e) {
    console.error("[saft-analyze] error", e);
    const msg = e instanceof Error ? e.message : "internal error";
    return ok({ ok: false, error: msg, internal_error: true }, 200);
  }
});
