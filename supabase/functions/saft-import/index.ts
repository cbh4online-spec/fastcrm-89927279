import { createClient } from "npm:@supabase/supabase-js@2";
import { parseSaftXml, type SaftParsed } from "../_shared/saft-parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

interface ImportOptions {
  create_customers?: boolean;
  create_products?: boolean;
  import_payments?: boolean;
}

function mapInvoiceType(t: string): string {
  // FT/FS/FR -> invoice, NC -> credit_note, ND -> debit_note
  if (t === "NC") return "credit_note";
  if (t === "ND") return "debit_note";
  if (t === "FR") return "receipt";
  return "invoice";
}

function mapStatus(s: string): string {
  // SAF-T PT InvoiceStatus → invoices.status (check constraint:
  // draft | sent | paid | partially_paid | overdue | cancelled)
  // N=Normal, S=Self-billing, A=Anulado, R=Resumo doc, F=Faturado
  if (s === "A") return "cancelled";
  if (s === "F") return "paid";
  return "sent";
}

// Util: chunk array
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function processImport(admin: any, imp: any, opts: ImportOptions, parsed: SaftParsed, userId: string) {
  const ws = imp.workspace_id;
  const importId = imp.id;

  // ---- Batched logging (saft_import_items) ----
  const logBuffer: any[] = [];
  const pushLog = (row: any) => logBuffer.push({ ...row, import_id: importId, workspace_id: ws });
  const flushLogs = async () => {
    if (!logBuffer.length) return;
    const rows = logBuffer.splice(0, logBuffer.length);
    for (const c of chunk(rows, 500)) {
      await admin.from("saft_import_items").insert(c);
    }
  };

  const isPersonalNif = (nif?: string | null) => {
    const d = (nif ?? "").replace(/\D/g, "");
    return d.length > 0 && /^[123]/.test(d);
  };

  // ===========================================================
  // 1) CUSTOMERS — pré-carrega existentes (1 query por tabela)
  // ===========================================================
  const customerMap = new Map<string, { contact_id: string | null; company_id: string | null }>();

  if (opts.create_customers !== false && parsed.customers.length) {
    const allNifs = [...new Set(parsed.customers.map((c) => c.tax_id).filter(Boolean) as string[])];
    const allEmails = [...new Set(parsed.customers.map((c) => c.email).filter(Boolean) as string[])];

    const fetchExisting = async (table: string) => {
      const byNif = new Map<string, string>();
      const byEmail = new Map<string, string>();
      const useDeletedFilter = table === "companies";
      if (allNifs.length) {
        for (const cnk of chunk(allNifs, 500)) {
          let q = admin.from(table).select("id, tax_id").eq("workspace_id", ws).in("tax_id", cnk);
          if (useDeletedFilter) q = q.is("deleted_at", null);
          const { data } = await q;
          for (const r of data ?? []) if (r.tax_id) byNif.set(r.tax_id, r.id);
        }
      }
      if (allEmails.length) {
        for (const cnk of chunk(allEmails, 500)) {
          let q = admin.from(table).select("id, email").eq("workspace_id", ws).in("email", cnk);
          if (useDeletedFilter) q = q.is("deleted_at", null);
          const { data } = await q;
          for (const r of data ?? []) if (r.email) byEmail.set(r.email, r.id);
        }
      }
      return { byNif, byEmail };
    };
    const [contactsIdx, companiesIdx] = await Promise.all([
      fetchExisting("contacts"),
      fetchExisting("companies"),
    ]);

    const newContacts: any[] = [];
    const newCompanies: any[] = [];
    const newContactKeys: string[] = [];
    const newCompanyKeys: string[] = [];

    // Todos os clientes SAF-T são tratados como Empresas (inclui ENI com NIF 1/2/3).
    // Mantém-se a deteção de particular apenas para enriquecimento futuro (tag/observação).
    for (const c of parsed.customers) {
      if (!c.customer_id) continue;

      // 1) match por NIF/email em companies, 2) fallback: match em contacts já existentes (legado)
      const existingCompanyId =
        (c.tax_id && companiesIdx.byNif.get(c.tax_id)) ||
        (c.email && companiesIdx.byEmail.get(c.email)) ||
        null;

      if (existingCompanyId) {
        customerMap.set(c.customer_id, { contact_id: null, company_id: existingCompanyId });
        pushLog({ entity_type: "customer", source_key: c.customer_id, action: "skipped_duplicate", target_id: existingCompanyId });
        continue;
      }

      // Reaproveita contacto legado (de imports antigos) para não duplicar entidades comerciais
      const legacyContactId =
        (c.tax_id && contactsIdx.byNif.get(c.tax_id)) ||
        (c.email && contactsIdx.byEmail.get(c.email)) ||
        null;
      if (legacyContactId) {
        customerMap.set(c.customer_id, { contact_id: legacyContactId, company_id: null });
        pushLog({ entity_type: "customer", source_key: c.customer_id, action: "skipped_duplicate", target_id: legacyContactId });
        continue;
      }

      newCompanies.push({
        workspace_id: ws, created_by: userId,
        name: c.name || c.customer_id, tax_id: c.tax_id, email: c.email, phone: c.phone,
        address: c.address, city: c.city, postal_code: c.postal_code, country: c.country,
        source: "saft_import", saft_import_id: importId,
        notes: isPersonalNif(c.tax_id) ? "Empresário em Nome Individual (ENI)" : null,
      });
      newCompanyKeys.push(c.customer_id);
    }

    const bulkInsertCustomers = async (table: string, rows: any[], keys: string[]) => {
      let cur = 0;
      for (const cnk of chunk(rows, 200)) {
        const { data, error } = await admin.from(table).insert(cnk).select("id");
        if (error) {
          for (let i = 0; i < cnk.length; i++) {
            const k = keys[cur + i];
            const { data: one, error: e2 } = await admin.from(table).insert(cnk[i]).select("id").single();
            if (e2) {
              pushLog({ entity_type: "customer", source_key: k, action: "failed", error_message: e2.message });
            } else {
              customerMap.set(k, table === "contacts" ? { contact_id: one.id, company_id: null } : { contact_id: null, company_id: one.id });
              pushLog({ entity_type: "customer", source_key: k, action: "created", target_id: one.id });
            }
          }
        } else {
          for (let i = 0; i < (data ?? []).length; i++) {
            const k = keys[cur + i];
            const id = data[i].id;
            customerMap.set(k, table === "contacts" ? { contact_id: id, company_id: null } : { contact_id: null, company_id: id });
            pushLog({ entity_type: "customer", source_key: k, action: "created", target_id: id });
          }
        }
        cur += cnk.length;
      }
    };
    await bulkInsertCustomers("contacts", newContacts, newContactKeys);
    await bulkInsertCustomers("companies", newCompanies, newCompanyKeys);
    await flushLogs();
  }

  // ===========================================================
  // 2) PRODUCTS — pré-carrega existentes
  // ===========================================================
  const productMap = new Map<string, string>();
  if (opts.create_products !== false && parsed.products.length) {
    const codes = [...new Set(parsed.products.map((p) => p.product_code).filter(Boolean))];
    const bySaft = new Map<string, string>();
    const bySku = new Map<string, string>();
    for (const cnk of chunk(codes, 500)) {
      const { data: a } = await admin
        .from("products").select("id, saft_product_code")
        .eq("workspace_id", ws).in("saft_product_code", cnk);
      for (const r of a ?? []) if (r.saft_product_code) bySaft.set(r.saft_product_code, r.id);
      const { data: b } = await admin
        .from("products").select("id, sku")
        .eq("workspace_id", ws).in("sku", cnk);
      for (const r of b ?? []) if (r.sku) bySku.set(r.sku, r.id);
    }

    const newRows: any[] = [];
    const newKeys: string[] = [];
    const backfill: string[] = [];

    for (const p of parsed.products) {
      if (!p.product_code) continue;
      const idSaft = bySaft.get(p.product_code);
      if (idSaft) {
        productMap.set(p.product_code, idSaft);
        pushLog({ entity_type: "product", source_key: p.product_code, action: "skipped_duplicate", target_id: idSaft });
        continue;
      }
      const idSku = bySku.get(p.product_code);
      if (idSku) {
        productMap.set(p.product_code, idSku);
        backfill.push(idSku);
        pushLog({ entity_type: "product", source_key: p.product_code, action: "skipped_duplicate", target_id: idSku });
        continue;
      }
      newRows.push({
        workspace_id: ws, created_by: userId,
        name: p.product_description || p.product_code,
        sku: p.product_code, saft_product_code: p.product_code,
        saft_import_id: importId,
      });
      newKeys.push(p.product_code);
    }

    if (backfill.length) {
      for (const cnk of chunk(backfill, 200)) {
        await admin.from("products").update({ saft_import_id: importId }).in("id", cnk);
      }
    }

    let cur = 0;
    for (const cnk of chunk(newRows, 200)) {
      const { data, error } = await admin.from("products").insert(cnk).select("id");
      if (error) {
        for (let i = 0; i < cnk.length; i++) {
          const k = newKeys[cur + i];
          const { data: one, error: e2 } = await admin.from("products").insert(cnk[i]).select("id").single();
          if (e2) pushLog({ entity_type: "product", source_key: k, action: "failed", error_message: e2.message });
          else { productMap.set(k, one.id); pushLog({ entity_type: "product", source_key: k, action: "created", target_id: one.id }); }
        }
      } else {
        for (let i = 0; i < (data ?? []).length; i++) {
          const k = newKeys[cur + i];
          productMap.set(k, data[i].id);
          pushLog({ entity_type: "product", source_key: k, action: "created", target_id: data[i].id });
        }
      }
      cur += cnk.length;
    }
    await flushLogs();
  }

  // ===========================================================
  // 3) INVOICES — pré-carrega existentes
  // ===========================================================
  const invoiceIdByNo = new Map<string, string>();
  const allInvNos = [...new Set(parsed.invoices.map((i) => i.invoice_no).filter(Boolean))];
  const existingInv = new Map<string, string>();
  for (const cnk of chunk(allInvNos, 500)) {
    const { data } = await admin
      .from("invoices").select("id, saft_invoice_no")
      .eq("workspace_id", ws).in("saft_invoice_no", cnk);
    for (const r of data ?? []) if (r.saft_invoice_no) existingInv.set(r.saft_invoice_no, r.id);
  }

  const newInvRows: any[] = [];
  const newInvKeys: string[] = [];
  const linesByKey = new Map<string, any[]>();

  for (const inv of parsed.invoices) {
    const existId = existingInv.get(inv.invoice_no);
    if (existId) {
      invoiceIdByNo.set(inv.invoice_no, existId);
      pushLog({ entity_type: "invoice", source_key: inv.invoice_no, source_hash: inv.hash, action: "skipped_duplicate", target_id: existId });
      continue;
    }
    const cust = customerMap.get(inv.customer_id);
    const custName = customerNameById.get(inv.customer_id) ?? "Consumidor final";

    // Salvaguarda anti-IVA-duplicado: alguns softwares exportam NetTotal já c/ IVA.
    // A verdade são as linhas: se o NetTotal do ficheiro ≈ soma dos brutos das linhas,
    // recalculamos subtotal/IVA/total a partir das linhas (net = s/ IVA, gross = c/ IVA).
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const linesNet = r2(inv.lines.reduce((s, l) => s + (l.line_total - l.tax_amount), 0));
    const linesGross = r2(inv.lines.reduce((s, l) => s + l.line_total, 0));
    let subtotal = inv.net_total, taxAmount = inv.tax_payable, total = inv.gross_total;
    if (inv.lines.length > 0 && Math.abs(r2(inv.net_total) - linesGross) <= 0.02 && linesGross > linesNet) {
      subtotal = linesNet;
      taxAmount = r2(linesGross - linesNet);
      total = linesGross;
    }
    newInvRows.push({
      workspace_id: ws, created_by: userId,
      invoice_number: inv.invoice_no,
      document_type: mapInvoiceType(inv.invoice_type),
      status: mapStatus(inv.invoice_status),
      issue_date: inv.invoice_date,
      due_date: inv.due_date ?? inv.invoice_date,
      client_name: custName,
      contact_id: cust?.contact_id ?? null,
      company_id: cust?.company_id ?? null,
      subtotal, tax_amount: taxAmount, total,
      currency: inv.currency,
      saft_import_id: importId, saft_invoice_no: inv.invoice_no,
      saft_atcud: inv.atcud, saft_hash: inv.hash,
    });
    newInvKeys.push(inv.invoice_no);
    linesByKey.set(inv.invoice_no, inv.lines);
  }

  const allInvoiceLines: any[] = [];
  const collectLines = (invId: string, key: string) => {
    const lines = linesByKey.get(key) ?? [];
    for (let j = 0; j < lines.length; j++) {
      const l = lines[j];
      allInvoiceLines.push({
        invoice_id: invId,
        product_id: l.product_code ? productMap.get(l.product_code) ?? null : null,
        description: l.description || "—",
        quantity: l.quantity, unit_price: l.unit_price,
        tax_rate: l.tax_percentage, tax_amount: l.tax_amount,
        net_total: l.line_total - l.tax_amount,
        gross_total: l.line_total, total: l.line_total,
        position: l.line_number ?? j + 1,
      });
    }
  };

  let invCur = 0;
  for (const cnk of chunk(newInvRows, 200)) {
    const { data, error } = await admin.from("invoices").insert(cnk).select("id");
    if (error) {
      for (let i = 0; i < cnk.length; i++) {
        const k = newInvKeys[invCur + i];
        const { data: one, error: e2 } = await admin.from("invoices").insert(cnk[i]).select("id").single();
        if (e2) { pushLog({ entity_type: "invoice", source_key: k, action: "failed", error_message: e2.message }); continue; }
        invoiceIdByNo.set(k, one.id);
        pushLog({ entity_type: "invoice", source_key: k, action: "created", target_id: one.id });
        collectLines(one.id, k);
      }
    } else {
      for (let i = 0; i < (data ?? []).length; i++) {
        const k = newInvKeys[invCur + i];
        const id = data[i].id;
        invoiceIdByNo.set(k, id);
        pushLog({ entity_type: "invoice", source_key: k, action: "created", target_id: id });
        collectLines(id, k);
      }
    }
    invCur += cnk.length;
  }

  for (const cnk of chunk(allInvoiceLines, 500)) {
    const { error } = await admin.from("invoice_items").insert(cnk);
    if (error) console.warn("[saft-import] invoice_items batch failed", error.message);
  }
  await flushLogs();

  // ===========================================================
  // 4) PAYMENTS — pré-carrega existentes
  // ===========================================================
  if (opts.import_payments !== false && parsed.payments.length) {
    const invoiceIds = [...new Set(parsed.payments.map((p) => invoiceIdByNo.get(p.invoice_no ?? "")).filter(Boolean) as string[])];
    const existingPay = new Set<string>();
    for (const cnk of chunk(invoiceIds, 500)) {
      const { data } = await admin
        .from("invoice_payments").select("id, invoice_id, saft_payment_ref")
        .in("invoice_id", cnk);
      for (const r of data ?? []) if (r.saft_payment_ref) existingPay.add(`${r.invoice_id}|${r.saft_payment_ref}`);
    }

    const newPays: any[] = [];
    const newPayKeys: string[] = [];
    for (const p of parsed.payments) {
      if (!p.payment_ref) {
        pushLog({ entity_type: "payment", source_key: p.invoice_no ?? "(sem ref)", action: "skipped", error_message: "Pagamento sem referência" });
        continue;
      }
      if (!p.invoice_no) {
        pushLog({ entity_type: "payment", source_key: p.payment_ref, action: "skipped", error_message: "Pagamento sem fatura associada" });
        continue;
      }
      const invId = invoiceIdByNo.get(p.invoice_no);
      if (!invId) {
        pushLog({ entity_type: "payment", source_key: p.payment_ref, action: "skipped", error_message: `Fatura ${p.invoice_no} não encontrada (anulada ou fora do período)` });
        continue;
      }
      const key = `${invId}|${p.payment_ref}`;
      if (existingPay.has(key)) {
        pushLog({ entity_type: "payment", source_key: p.payment_ref, action: "skipped_duplicate" });
        continue;
      }
      existingPay.add(key);
      newPays.push({
        invoice_id: invId, workspace_id: ws, created_by: userId,
        amount: p.amount,
        payment_date: p.payment_date || new Date().toISOString().slice(0, 10),
        payment_method: p.payment_method, reference: p.payment_ref,
        saft_import_id: importId, saft_payment_ref: p.payment_ref,
      });
      newPayKeys.push(p.payment_ref);
    }

    let pCur = 0;
    for (const cnk of chunk(newPays, 300)) {
      const { data, error } = await admin.from("invoice_payments").insert(cnk).select("id");
      if (error) {
        for (let i = 0; i < cnk.length; i++) {
          const k = newPayKeys[pCur + i];
          const { data: one, error: e2 } = await admin.from("invoice_payments").insert(cnk[i]).select("id").single();
          if (e2) pushLog({ entity_type: "payment", source_key: k, action: "failed", error_message: e2.message });
          else pushLog({ entity_type: "payment", source_key: k, action: "created", target_id: one.id });
        }
      } else {
        for (let i = 0; i < (data ?? []).length; i++) {
          pushLog({ entity_type: "payment", source_key: newPayKeys[pCur + i], action: "created", target_id: data[i].id });
        }
      }
      pCur += cnk.length;
    }
    await flushLogs();
  }

  // ===========================================================
  // 5) Recompute amount_paid + status (em lote, paralelo)
  // ===========================================================
  const touchedInvIds = [...new Set(
    parsed.payments.map((p) => invoiceIdByNo.get(p.invoice_no ?? "")).filter(Boolean) as string[]
  )];
  if (touchedInvIds.length) {
    const paidByInv = new Map<string, number>();
    const invMeta = new Map<string, { total: number; status: string }>();
    for (const cnk of chunk(touchedInvIds, 500)) {
      const { data: pays } = await admin
        .from("invoice_payments").select("invoice_id, amount").in("invoice_id", cnk);
      for (const r of pays ?? []) paidByInv.set(r.invoice_id, (paidByInv.get(r.invoice_id) ?? 0) + Number(r.amount || 0));
      const { data: invs } = await admin
        .from("invoices").select("id, total, status").in("id", cnk);
      for (const r of invs ?? []) invMeta.set(r.id, { total: Number(r.total || 0), status: r.status });
    }

    const MAX_PARALLEL = 20;
    let pending: Promise<any>[] = [];
    for (const invId of touchedInvIds) {
      const meta = invMeta.get(invId); if (!meta) continue;
      const paid = paidByInv.get(invId) ?? 0;
      let status = meta.status;
      if (status !== "cancelled") {
        if (paid >= meta.total - 0.005) status = "paid";
        else if (paid > 0) status = "partially_paid";
      }
      pending.push(admin.from("invoices").update({ amount_paid: paid, status }).eq("id", invId));
      if (pending.length >= MAX_PARALLEL) { await Promise.all(pending); pending = []; }
    }
    if (pending.length) await Promise.all(pending);
  }

  await flushLogs();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return ok({ ok: false, error: "missing auth" }, 200);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return ok({ ok: false, error: "unauthorized" }, 200);

    const body = await req.json();
    const import_id = body?.import_id as string;
    const options: ImportOptions = body?.options ?? {};
    if (!import_id) return ok({ ok: false, error: "import_id required" }, 200);

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: imp } = await admin.from("saft_imports").select("*").eq("id", import_id).maybeSingle();
    if (!imp) return ok({ ok: false, error: "not found" }, 200);

    const allowed = await canAccessWorkspace(admin, imp.workspace_id, user.id);
    if (!allowed) return ok({ ok: false, error: "Sem permissão para importar SAF-T neste workspace" }, 200);

    if (imp.status === "completed") return ok({ ok: false, error: "já importado" }, 200);

    await admin.from("saft_imports").update({ status: "importing", options }).eq("id", import_id);

    // Re-download + parse (could be optimised by caching)
    const { data: file, error: dlErr } = await admin.storage.from("saft-imports").download(imp.storage_path);
    if (dlErr || !file) {
      await admin.from("saft_imports").update({ status: "failed", error_message: "download failed" }).eq("id", import_id);
      return ok({ ok: false, error: "download failed" }, 200);
    }
    // Detectar encoding pelo header XML (SAF-T PT é frequentemente ISO-8859-1 / Windows-1252)
    const bytes = new Uint8Array(await file.arrayBuffer());
    const header = new TextDecoder("ascii").decode(bytes.slice(0, 200)).toLowerCase();
    const encMatch = header.match(/encoding=["']([^"']+)["']/);
    const declared = (encMatch?.[1] ?? "utf-8").toLowerCase();
    const useEnc = declared.includes("8859") || declared.includes("1252") || declared.includes("windows")
      ? "windows-1252"
      : "utf-8";
    const xml = new TextDecoder(useEnc).decode(bytes);
    const parsed = parseSaftXml(xml);

    // Run heavy work in background so we don't hit WORKER_RESOURCE_LIMIT on the request.
    // Frontend polls saft_imports.status + saft_import_items for progress.
    // @ts-ignore EdgeRuntime is a Deno deploy global
    EdgeRuntime.waitUntil((async () => {
      try {
        await processImport(admin, imp, options, parsed, user.id);

        // Paginar para contornar o limite de 1000 linhas por defeito do PostgREST
        const summary: Record<string, Record<string, number>> = {};
        const PAGE = 1000;
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: page, error: pageErr } = await admin
            .from("saft_import_items")
            .select("entity_type, action")
            .eq("import_id", import_id)
            .range(from, from + PAGE - 1);
          if (pageErr) { console.warn("[saft-import] summary page error", pageErr.message); break; }
          if (!page || page.length === 0) break;
          for (const r of page) {
            summary[r.entity_type] ??= {};
            summary[r.entity_type][r.action] = (summary[r.entity_type][r.action] ?? 0) + 1;
          }
          if (page.length < PAGE) break;
          from += PAGE;
        }

        await admin.from("saft_imports").update({
          status: "completed",
          completed_at: new Date().toISOString(),
          stats: { ...(imp.stats ?? {}), summary },
        }).eq("id", import_id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "import error";
        console.error("[saft-import] background error", msg);
        await admin.from("saft_imports").update({
          status: "failed",
          error_message: msg,
          completed_at: new Date().toISOString(),
        }).eq("id", import_id);
      }
    })());

    return ok({ ok: true, status: "running", message: "Importação iniciada em background" });
  } catch (e) {
    console.error("[saft-import] error", e);
    const msg = e instanceof Error ? e.message : "internal error";
    return ok({ ok: false, error: msg, internal_error: true }, 200);
  }
});
