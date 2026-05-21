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

async function processImport(admin: any, imp: any, opts: ImportOptions, parsed: SaftParsed, userId: string) {
  const ws = imp.workspace_id;
  const importId = imp.id;

  // 1) Customers: SAF-T PT customers são tipicamente entidades comerciais (B2B).
  //    Roteamos por heurística do NIF PT:
  //      - NIF começa por 1/2/3 → particular  → contacts
  //      - NIF começa por 5/6/8/9 (ou sem NIF) → empresa → companies
  //    Dedupe por tax_id (NIF) dentro de cada tabela, com fallback por email.
  const customerMap = new Map<string, { contact_id: string | null; company_id: string | null }>();

  const isPersonalNif = (nif?: string | null) => {
    const d = (nif ?? "").replace(/\D/g, "");
    return d.length > 0 && /^[123]/.test(d);
  };

  if (opts.create_customers !== false) {
    for (const c of parsed.customers) {
      if (!c.customer_id) continue;
      let contactId: string | null = null;
      let companyId: string | null = null;

      const routeToContacts = isPersonalNif(c.tax_id);

      if (routeToContacts) {
        // ---- CONTACTS branch (particulares) ----
        if (c.tax_id) {
          const { data: existing } = await admin
            .from("contacts").select("id")
            .eq("workspace_id", ws).eq("tax_id", c.tax_id)
            .limit(1).maybeSingle();
          if (existing) contactId = existing.id;
        }
        if (!contactId && c.email) {
          const { data: existing } = await admin
            .from("contacts").select("id")
            .eq("workspace_id", ws).eq("email", c.email)
            .limit(1).maybeSingle();
          if (existing) contactId = existing.id;
        }
        if (contactId) {
          await admin.from("saft_import_items").insert({
            import_id: importId, workspace_id: ws, entity_type: "customer",
            source_key: c.customer_id, action: "skipped_duplicate", target_id: contactId,
          });
        } else {
          const { data: inserted, error } = await admin
            .from("contacts")
            .insert({
              workspace_id: ws,
              created_by: userId,
              name: c.name || c.customer_id,
              tax_id: c.tax_id,
              email: c.email,
              phone: c.phone,
              address: c.address,
              city: c.city,
              postal_code: c.postal_code,
              country: c.country,
              emails: c.email ? [{ value: c.email, primary: true }] : [],
              phones: c.phone ? [{ value: c.phone, primary: true }] : [],
              saft_import_id: importId,
            })
            .select("id").single();
          if (error) {
            await admin.from("saft_import_items").insert({
              import_id: importId, workspace_id: ws, entity_type: "customer",
              source_key: c.customer_id, action: "failed", error_message: error.message,
            });
            continue;
          }
          contactId = inserted.id;
          await admin.from("saft_import_items").insert({
            import_id: importId, workspace_id: ws, entity_type: "customer",
            source_key: c.customer_id, action: "created", target_id: contactId,
          });
        }
      } else {
        // ---- COMPANIES branch (empresas / default) ----
        if (c.tax_id) {
          const { data: existing } = await admin
            .from("companies").select("id")
            .eq("workspace_id", ws).eq("tax_id", c.tax_id)
            .is("deleted_at", null)
            .limit(1).maybeSingle();
          if (existing) companyId = existing.id;
        }
        if (!companyId && c.email) {
          const { data: existing } = await admin
            .from("companies").select("id")
            .eq("workspace_id", ws).eq("email", c.email)
            .is("deleted_at", null)
            .limit(1).maybeSingle();
          if (existing) companyId = existing.id;
        }
        if (companyId) {
          await admin.from("saft_import_items").insert({
            import_id: importId, workspace_id: ws, entity_type: "customer",
            source_key: c.customer_id, action: "skipped_duplicate", target_id: companyId,
          });
        } else {
          const { data: inserted, error } = await admin
            .from("companies")
            .insert({
              workspace_id: ws,
              created_by: userId,
              name: c.name || c.customer_id,
              tax_id: c.tax_id,
              email: c.email,
              phone: c.phone,
              address: c.address,
              city: c.city,
              postal_code: c.postal_code,
              country: c.country,
              source: "saft_import",
              saft_import_id: importId,
            })
            .select("id").single();
          if (error) {
            await admin.from("saft_import_items").insert({
              import_id: importId, workspace_id: ws, entity_type: "customer",
              source_key: c.customer_id, action: "failed", error_message: error.message,
            });
            continue;
          }
          companyId = inserted.id;
          await admin.from("saft_import_items").insert({
            import_id: importId, workspace_id: ws, entity_type: "customer",
            source_key: c.customer_id, action: "created", target_id: companyId,
          });
        }
      }

      customerMap.set(c.customer_id, { contact_id: contactId, company_id: companyId });
    }
  }

  // 2) Products
  const productMap = new Map<string, string>();
  if (opts.create_products !== false) {
    for (const p of parsed.products) {
      if (!p.product_code) continue;

      // 1) Look up by saft_product_code first
      let { data: existing } = await admin
        .from("products")
        .select("id")
        .eq("workspace_id", ws)
        .eq("saft_product_code", p.product_code)
        .limit(1)
        .maybeSingle();

      // 2) Fallback: look up by SKU (avoids unique constraint violation
      //    when product already exists imported through other channels)
      if (!existing) {
        const { data: bySku } = await admin
          .from("products")
          .select("id")
          .eq("workspace_id", ws)
          .eq("sku", p.product_code)
          .limit(1)
          .maybeSingle();
        if (bySku) {
          existing = bySku;
          // Backfill saft_product_code so future imports match directly
          await admin
            .from("products")
            .update({ saft_product_code: p.product_code, saft_import_id: importId })
            .eq("id", bySku.id);
        }
      }

      if (existing) {
        productMap.set(p.product_code, existing.id);
        await admin.from("saft_import_items").insert({
          import_id: importId, workspace_id: ws, entity_type: "product",
          source_key: p.product_code, action: "skipped_duplicate", target_id: existing.id,
        });
        continue;
      }

      const { data: inserted, error } = await admin
        .from("products")
        .insert({
          workspace_id: ws,
          created_by: userId,
          name: p.product_description || p.product_code,
          sku: p.product_code,
          saft_product_code: p.product_code,
          saft_import_id: importId,
        })
        .select("id")
        .single();
      if (error) {
        await admin.from("saft_import_items").insert({
          import_id: importId, workspace_id: ws, entity_type: "product",
          source_key: p.product_code, action: "failed", error_message: error.message,
        });
        continue;
      }
      productMap.set(p.product_code, inserted.id);
      await admin.from("saft_import_items").insert({
        import_id: importId, workspace_id: ws, entity_type: "product",
        source_key: p.product_code, action: "created", target_id: inserted.id,
      });
    }

  }

  // 3) Invoices
  const invoiceIdByNo = new Map<string, string>();
  for (const inv of parsed.invoices) {
    // Idempotency: skip if already exists with same hash
    const { data: existing } = await admin
      .from("invoices")
      .select("id, saft_hash")
      .eq("workspace_id", ws)
      .eq("saft_invoice_no", inv.invoice_no)
      .limit(1)
      .maybeSingle();

    if (existing) {
      invoiceIdByNo.set(inv.invoice_no, existing.id);
      await admin.from("saft_import_items").insert({
        import_id: importId, workspace_id: ws, entity_type: "invoice",
        source_key: inv.invoice_no, source_hash: inv.hash, action: "skipped_duplicate", target_id: existing.id,
      });
      continue;
    }

    const cust = customerMap.get(inv.customer_id);
    const custName = parsed.customers.find(c => c.customer_id === inv.customer_id)?.name ?? "Consumidor final";
    const { data: insertedInv, error } = await admin
      .from("invoices")
      .insert({
        workspace_id: ws,
        created_by: userId,
        invoice_number: inv.invoice_no,
        document_type: mapInvoiceType(inv.invoice_type),
        status: mapStatus(inv.invoice_status),
        issue_date: inv.invoice_date,
        due_date: inv.due_date ?? inv.invoice_date,
        client_name: custName,
        contact_id: cust?.contact_id ?? null,
        company_id: cust?.company_id ?? null,
        subtotal: inv.net_total,
        tax_amount: inv.tax_payable,
        total: inv.gross_total,
        currency: inv.currency,
        saft_import_id: importId,
        saft_invoice_no: inv.invoice_no,
        saft_atcud: inv.atcud,
        saft_hash: inv.hash,
      })
      .select("id")
      .single();

    if (error) {
      await admin.from("saft_import_items").insert({
        import_id: importId, workspace_id: ws, entity_type: "invoice",
        source_key: inv.invoice_no, action: "failed", error_message: error.message,
      });
      continue;
    }

    invoiceIdByNo.set(inv.invoice_no, insertedInv.id);
    await admin.from("saft_import_items").insert({
      import_id: importId, workspace_id: ws, entity_type: "invoice",
      source_key: inv.invoice_no, source_hash: inv.hash, action: "created", target_id: insertedInv.id,
    });

    // Invoice lines
    if (inv.lines.length) {
      const lineRows = inv.lines.map((l, idx) => ({
        invoice_id: insertedInv.id,
        product_id: l.product_code ? productMap.get(l.product_code) ?? null : null,
        description: l.description || "—",
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_rate: l.tax_percentage,
        tax_amount: l.tax_amount,
        net_total: l.line_total - l.tax_amount,
        gross_total: l.line_total,
        total: l.line_total,
        position: l.line_number ?? idx + 1,
      }));
      const { error: linesErr } = await admin.from("invoice_items").insert(lineRows);
      if (linesErr) console.warn("[saft-import] invoice_items insert failed", linesErr.message);
    }
  }

  // 4) Payments
  if (opts.import_payments !== false) {
    for (const p of parsed.payments) {
      if (!p.payment_ref || !p.invoice_no) continue;
      const invoiceId = invoiceIdByNo.get(p.invoice_no);
      if (!invoiceId) continue;

      const { data: existing } = await admin
        .from("invoice_payments")
        .select("id")
        .eq("invoice_id", invoiceId)
        .eq("saft_payment_ref", p.payment_ref)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await admin.from("saft_import_items").insert({
          import_id: importId, workspace_id: ws, entity_type: "payment",
          source_key: p.payment_ref, action: "skipped_duplicate", target_id: existing.id,
        });
        continue;
      }

      const { data: insertedPay, error } = await admin
        .from("invoice_payments")
        .insert({
          invoice_id: invoiceId,
          workspace_id: ws,
          created_by: userId,
          amount: p.amount,
          payment_date: p.payment_date || new Date().toISOString().slice(0, 10),
          payment_method: p.payment_method,
          reference: p.payment_ref,
          saft_import_id: importId,
          saft_payment_ref: p.payment_ref,
        })
        .select("id")
        .single();

      if (error) {
        await admin.from("saft_import_items").insert({
          import_id: importId, workspace_id: ws, entity_type: "payment",
          source_key: p.payment_ref, action: "failed", error_message: error.message,
        });
        continue;
      }
      await admin.from("saft_import_items").insert({
        import_id: importId, workspace_id: ws, entity_type: "payment",
        source_key: p.payment_ref, action: "created", target_id: insertedPay.id,
      });
    }
  }

  // 5) Recompute invoice amount_paid + status a partir dos invoice_payments importados
  const touched = new Set<string>();
  for (const p of parsed.payments) {
    const invId = invoiceIdByNo.get(p.invoice_no ?? "");
    if (invId) touched.add(invId);
  }
  for (const invId of touched) {
    const { data: pays } = await admin
      .from("invoice_payments").select("amount").eq("invoice_id", invId);
    const paid = (pays ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const { data: inv } = await admin
      .from("invoices").select("total, status").eq("id", invId).maybeSingle();
    if (!inv) continue;
    const total = Number(inv.total || 0);
    let status = inv.status as string;
    if (status !== "cancelled") {
      if (paid >= total - 0.005) status = "paid";
      else if (paid > 0) status = "partially_paid";
    }
    await admin.from("invoices").update({ amount_paid: paid, status }).eq("id", invId);
  }
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

    const { data: member } = await admin
      .from("workspace_members").select("user_id")
      .eq("workspace_id", imp.workspace_id).eq("user_id", user.id).maybeSingle();
    if (!member) return ok({ ok: false, error: "forbidden" }, 200);

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

    try {
      await processImport(admin, imp, options, parsed, user.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "import error";
      await admin.from("saft_imports").update({ status: "failed", error_message: msg, completed_at: new Date().toISOString() }).eq("id", import_id);
      return ok({ ok: false, error: msg, internal_error: true }, 200);
    }

    // Aggregate counts
    const { data: itemCounts } = await admin
      .from("saft_import_items")
      .select("entity_type, action")
      .eq("import_id", import_id);

    const summary: Record<string, Record<string, number>> = {};
    for (const r of itemCounts ?? []) {
      summary[r.entity_type] ??= {};
      summary[r.entity_type][r.action] = (summary[r.entity_type][r.action] ?? 0) + 1;
    }

    await admin.from("saft_imports").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      stats: { ...(imp.stats ?? {}), summary },
    }).eq("id", import_id);

    return ok({ ok: true, summary });
  } catch (e) {
    console.error("[saft-import] error", e);
    const msg = e instanceof Error ? e.message : "internal error";
    return ok({ ok: false, error: msg, internal_error: true }, 200);
  }
});
