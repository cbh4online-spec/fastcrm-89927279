// Aplicação de uma importação ARTSOFT: cria empresas/contactos em falta,
// cria/actualiza facturas (dedupe por external_id) e abre/atualiza collection_cases.
import { createClient } from "npm:@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return ok({ error: "missing auth" }, 200);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return ok({ error: "unauthorized" }, 200);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { import_id } = await req.json().catch(() => ({}));
    if (!import_id) return ok({ error: "missing import_id" }, 200);

    const { data: imp } = await admin
      .from("collection_imports")
      .select("*")
      .eq("id", import_id)
      .maybeSingle();
    if (!imp) return ok({ error: "import not found" }, 200);

    const { data: allowed, error: allowedError } = await admin.rpc("is_workspace_member", {
      _user_id: user.id,
      _workspace_id: imp.workspace_id,
    });
    if (allowedError) {
      console.error("[collections-import-apply] workspace permission check failed", {
        user_id: user.id,
        workspace_id: imp.workspace_id,
        import_id,
        error: allowedError.message,
      });
    }
    if (!allowed) {
      console.warn("[collections-import-apply] forbidden", { user_id: user.id, workspace_id: imp.workspace_id, import_id });
      return ok({ error: "forbidden", details: "Não és membro do workspace deste import." }, 200);
    }

    await admin
      .from("collection_imports")
      .update({ status: "importing", error_message: null })
      .eq("id", import_id);

    // Run heavy work in background
    const run = async () => {
      const stats = { invoices_created: 0, invoices_updated: 0, companies_created: 0, contacts_created: 0, cases_opened: 0, cases_updated: 0, skipped: 0, failed: 0 };
      try {
        const { data: items } = await admin
          .from("collection_import_items")
          .select("*")
          .eq("import_id", import_id);
        if (!items || items.length === 0) {
          await admin.from("collection_imports").update({ status: "completed", stats: { ...imp.stats, ...stats } }).eq("id", import_id);
          return;
        }

        const wsId = imp.workspace_id;
        const pending = items.filter((it: any) => it.action !== "skipped" && it.action !== "needs_mapping");

        // Cache: client_number -> { company_id, contact_id, debtor_type, debtor_name, debtor_email }
        const clientCache = new Map<string, { company_id: string | null; contact_id: string | null; debtor_type: "company" | "contact"; debtor_name: string; debtor_email: string | null }>();

        // Group by client to ensure single case per debtor
        const byClient = new Map<string, any[]>();
        for (const it of pending) {
          if (!byClient.has(it.client_number)) byClient.set(it.client_number, []);
          byClient.get(it.client_number)!.push(it);
        }

        for (const [clientNo, rows] of byClient) {
          try {
            // Resolve or create debtor
            const sample = rows[0];
            let company_id: string | null = sample.matched_company_id;
            let contact_id: string | null = sample.matched_contact_id;

            if (!company_id && !contact_id) {
              // Heuristic: looks like a company if name has Lda/SA/Unipessoal/Sociedade
              const isCompany = /\b(Lda|S\.?A\.?|Unipessoal|Sociedade|EIRELI|S\.?L\.?|GmbH|Inc\.?)\b/i.test(sample.client_name || "");
              if (isCompany) {
                const { data: newCo, error } = await admin.from("companies").insert({
                  workspace_id: wsId,
                  name: sample.client_name || `Cliente ARTSOFT ${clientNo}`,
                  address: sample.client_address,
                  email: sample.client_email,
                  external_provider: "artsoft",
                  external_id: clientNo,
                  source: "artsoft_import",
                  created_by: user.id,
                  updated_by: user.id,
                }).select("id").single();
                if (error) throw error;
                company_id = newCo.id;
                stats.companies_created++;
              } else {
                const { data: newCt, error } = await admin.from("contacts").insert({
                  workspace_id: wsId,
                  name: sample.client_name || `Cliente ARTSOFT ${clientNo}`,
                  address: sample.client_address,
                  email: sample.client_email,
                  external_provider: "artsoft",
                  external_id: clientNo,
                  source: "artsoft_import",
                  created_by: user.id,
                }).select("id").single();
                if (error) throw error;
                contact_id = newCt.id;
                stats.contacts_created++;
              }
            }

            const debtor_type = company_id ? "company" : "contact";
            clientCache.set(clientNo, {
              company_id,
              contact_id,
              debtor_type,
              debtor_name: sample.client_name,
              debtor_email: sample.client_email,
            });

            // Upsert invoices per row
            const invoiceIds: string[] = [];
            for (const r of rows) {
              const externalId = String(r.doc_no);
              // Find existing invoice
              const { data: existing } = await admin
                .from("invoices")
                .select("id")
                .eq("workspace_id", wsId)
                .eq("external_provider", "artsoft")
                .eq("external_id", externalId)
                .maybeSingle();

              const total = Number(r.total) || 0;
              const balance = Number(r.balance) || 0;
              const amount_paid = Math.max(0, total - balance);
              const status = balance <= 0.01 ? "paid" : amount_paid > 0 ? "partially_paid" : "sent";

              const payload: any = {
                workspace_id: wsId,
                company_id,
                contact_id,
                client_name: r.client_name,
                client_email: r.client_email,
                client_address: r.client_address,
                invoice_number: r.doc_third_no || r.doc_no,
                issue_date: r.doc_date,
                due_date: r.due_date,
                subtotal: total,
                tax_amount: 0,
                total,
                amount_paid,
                status,
                external_provider: "artsoft",
                external_id: externalId,
                external_synced_at: new Date().toISOString(),
                document_type: r.doc_type?.startsWith("B2") ? "credit_note" : "invoice",
              };

              if (existing) {
                const { error } = await admin
                  .from("invoices")
                  .update({ amount_paid, status, due_date: r.due_date, total })
                  .eq("id", existing.id);
                if (error) throw error;
                invoiceIds.push(existing.id);
                stats.invoices_updated++;
                await admin.from("collection_import_items").update({
                  matched_invoice_id: existing.id, action: "update_invoice",
                }).eq("id", r.id);
              } else {
                const { data: ins, error } = await admin
                  .from("invoices")
                  .insert({ ...payload, created_by: user.id })
                  .select("id")
                  .single();
                if (error) throw error;
                invoiceIds.push(ins.id);
                stats.invoices_created++;
                await admin.from("collection_import_items").update({
                  matched_invoice_id: ins.id, action: "create_invoice",
                }).eq("id", r.id);
              }
            }

            // Open/update collection case
            const totalDue = rows.reduce((acc: number, r: any) => acc + (Number(r.balance) || 0), 0);
            const oldestDue = rows
              .map((r: any) => r.due_date)
              .filter(Boolean)
              .sort()[0];
            const daysOverdue = oldestDue
              ? Math.max(0, Math.floor((Date.now() - new Date(oldestDue).getTime()) / 86400000))
              : 0;

            let caseId: string | null = null;
            if (debtor_type === "company" && company_id) {
              const { data: existingCase } = await admin
                .from("collection_cases")
                .select("id")
                .eq("workspace_id", wsId)
                .eq("company_id", company_id)
                .is("deleted_at", null)
                .not("status", "in", "(paid,closed)")
                .maybeSingle();
              caseId = existingCase?.id || null;
            } else if (debtor_type === "contact" && contact_id) {
              const { data: existingCase } = await admin
                .from("collection_cases")
                .select("id")
                .eq("workspace_id", wsId)
                .eq("contact_id", contact_id)
                .is("deleted_at", null)
                .not("status", "in", "(paid,closed)")
                .maybeSingle();
              caseId = existingCase?.id || null;
            }

            if (caseId) {
              await admin.from("collection_cases").update({
                total_due: totalDue,
                oldest_due_date: oldestDue,
                days_overdue: daysOverdue,
                invoices_count: invoiceIds.length,
                status: totalDue <= 0.01 ? "paid" : "in_progress",
              }).eq("id", caseId);
              stats.cases_updated++;
            } else if (totalDue > 0.01) {
              const dr = clientCache.get(clientNo)!;
              const { data: newCase, error } = await admin.from("collection_cases").insert({
                workspace_id: wsId,
                debtor_type,
                company_id,
                contact_id,
                debtor_name: dr.debtor_name || `Cliente ARTSOFT ${clientNo}`,
                debtor_email: dr.debtor_email,
                total_due: totalDue,
                oldest_due_date: oldestDue,
                days_overdue: daysOverdue,
                invoices_count: invoiceIds.length,
                status: "new",
                notes: `Importado de ARTSOFT (#${clientNo}) — ${new Date().toLocaleDateString("pt-PT")}`,
              }).select("id").single();
              if (error) throw error;
              caseId = newCase.id;
              stats.cases_opened++;
            }

            // Link invoices to case
            if (caseId && invoiceIds.length > 0) {
              const links = invoiceIds.map((iid) => ({
                workspace_id: wsId,
                case_id: caseId!,
                invoice_id: iid,
                snapshot_total: 0,
                snapshot_amount_paid: 0,
              }));
              for (let i = 0; i < links.length; i += 100) {
                await admin
                  .from("collection_case_invoices")
                  .upsert(links.slice(i, i + 100), { onConflict: "case_id,invoice_id" });
              }
            }
          } catch (e) {
            console.error(`[collections-import-apply] cliente ${clientNo}:`, e);
            stats.failed += rows.length;
            for (const r of rows) {
              await admin
                .from("collection_import_items")
                .update({ action: "failed", error_message: String((e as Error).message || e) })
                .eq("id", r.id);
            }
          }
        }

        await admin
          .from("collection_imports")
          .update({ status: "completed", stats: { ...imp.stats, applied: stats } })
          .eq("id", import_id);
      } catch (e) {
        console.error("[collections-import-apply] fatal:", e);
        await admin
          .from("collection_imports")
          .update({ status: "failed", error_message: String((e as Error).message || e) })
          .eq("id", import_id);
      }
    };

    // Run in background; respond immediately
    // @ts-expect-error EdgeRuntime is available in Supabase Functions runtime
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(run());
    else await run();

    return ok({ ok: true, queued: true, import_id });
  } catch (e) {
    console.error("[collections-import-apply] error:", e);
    return ok({ ok: false, error: String((e as Error).message || e) }, 200);
  }
});
