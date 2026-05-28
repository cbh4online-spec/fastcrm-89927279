import { createClient } from "npm:@supabase/supabase-js@2";
import { parseSaftXml, computeStats } from "../_shared/saft-parser.ts";

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

    await admin.from("saft_imports").update({ status: "analyzing", started_at: new Date().toISOString(), error_message: null }).eq("id", import_id);

    // Run heavy parsing in background to avoid WORKER_RESOURCE_LIMIT on large SAF-T files (>10MB).
    // Frontend polls saft_imports.status (analyzing → preview_ready | failed).
    const runAnalysis = async () => {
      try {
        const { data: file, error: dlErr } = await admin.storage.from("saft-imports").download(imp.storage_path);
        if (dlErr || !file) {
          await admin.from("saft_imports").update({ status: "failed", error_message: dlErr?.message ?? "download failed" }).eq("id", import_id);
          return;
        }

        // Detectar encoding pelo header XML (SAF-T PT é frequentemente ISO-8859-1 / Windows-1252)
        const bytes = new Uint8Array(await file.arrayBuffer());
        const head = new TextDecoder("ascii").decode(bytes.slice(0, 200)).toLowerCase();
        const encMatch = head.match(/encoding=["']([^"']+)["']/);
        const declared = (encMatch?.[1] ?? "utf-8").toLowerCase();
        const useEnc = declared.includes("8859") || declared.includes("1252") || declared.includes("windows")
          ? "windows-1252"
          : "utf-8";
        const xml = new TextDecoder(useEnc).decode(bytes);

        const parsed = parseSaftXml(xml);
        const stats = computeStats(parsed);

        const invoiceNos = parsed.invoices.map(i => i.invoice_no);
        let existingInvoices = 0;
        if (invoiceNos.length) {
          // Chunk IN() para evitar URLs gigantes em SAF-T anuais
          const CHUNK = 500;
          for (let i = 0; i < invoiceNos.length; i += CHUNK) {
            const slice = invoiceNos.slice(i, i + CHUNK);
            const { count } = await admin
              .from("invoices")
              .select("id", { count: "exact", head: true })
              .eq("workspace_id", imp.workspace_id)
              .in("saft_invoice_no", slice);
            existingInvoices += count ?? 0;
          }
        }

        const fullStats = { ...stats, existing_invoices: existingInvoices, new_invoices: stats.invoices - existingInvoices };

        await admin.from("saft_imports").update({
          status: "preview_ready",
          saft_type: parsed.header.saft_type,
          saft_version: parsed.header.saft_version,
          software_company: parsed.header.software_company,
          software_id: parsed.header.software_id,
          tax_registration_number: parsed.header.tax_registration_number,
          fiscal_year: parsed.header.fiscal_year,
          period_start: parsed.header.period_start,
          period_end: parsed.header.period_end,
          stats: fullStats,
        }).eq("id", import_id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "parse error";
        console.error("[saft-analyze:bg] error", msg);
        await admin.from("saft_imports").update({ status: "failed", error_message: msg }).eq("id", import_id);
      }
    };

    // @ts-ignore EdgeRuntime is provided by Deno Deploy runtime
    EdgeRuntime.waitUntil(runAnalysis());

    return ok({ ok: true, queued: true, import_id });
  } catch (e) {
    console.error("[saft-analyze] error", e);
    const msg = e instanceof Error ? e.message : "internal error";
    return ok({ ok: false, error: msg, internal_error: true }, 200);
  }
});
