// Leitor SAF-T PT incremental (streaming).
// Percorre o XML por blocos e emite cada <Customer>, <Product>, <Invoice> e
// <Payment> assim que o elemento fecha, sem nunca construir a árvore completa
// em memória. Mantém exatamente os mesmos tipos do saft-parser legado.
import { XMLParser } from "npm:fast-xml-parser@4";
import type {
  SaftCustomer,
  SaftHeader,
  SaftInvoice,
  SaftInvoiceLine,
  SaftPayment,
  SaftProduct,
  SaftType,
} from "./saft-parser.ts";

const fragmentParser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
  isArray: (name) => ["Line", "PaymentMethod", "SourceDocumentID"].includes(name),
});

export function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

export function mapCustomer(c: any): SaftCustomer {
  const addr = c.BillingAddress ?? c.CompanyAddress ?? {};
  return {
    customer_id: String(c.CustomerID ?? ""),
    name: c.CompanyName ?? "",
    tax_id: c.CustomerTaxID ? String(c.CustomerTaxID) : null,
    email: c.Email ?? null,
    phone: c.Telephone ?? null,
    address: addr.AddressDetail ?? null,
    city: addr.City ?? null,
    postal_code: addr.PostalCode ?? null,
    country: addr.Country ?? null,
  };
}

export function mapProduct(p: any): SaftProduct {
  return {
    product_code: String(p.ProductCode ?? ""),
    product_description: p.ProductDescription ?? "",
    product_type: p.ProductType ?? null,
  };
}

export function mapInvoice(inv: any): SaftInvoice {
  const docTotals = inv.DocumentTotals ?? {};
  const lines: SaftInvoiceLine[] = (inv.Line ?? []).filter(Boolean).map((l: any, idx: number) => {
    const qty = toNum(l.Quantity);
    const unit = toNum(l.UnitPrice);
    const tax = l.Tax ?? {};
    const taxPct = toNum(tax.TaxPercentage);
    const credit = toNum(l.CreditAmount);
    const debit = toNum(l.DebitAmount);
    const lineNet = credit || debit || qty * unit;
    const taxAmount = (lineNet * taxPct) / 100;
    return {
      line_number: Number(l.LineNumber ?? idx + 1),
      product_code: l.ProductCode ? String(l.ProductCode) : null,
      description: l.Description ?? "",
      quantity: qty,
      unit_price: unit,
      tax_percentage: taxPct,
      tax_amount: taxAmount,
      line_total: lineNet + taxAmount,
    };
  });
  return {
    invoice_no: String(inv.InvoiceNo ?? ""),
    atcud: inv.ATCUD ?? null,
    invoice_type: inv.InvoiceType ?? "FT",
    invoice_status: inv.DocumentStatus?.InvoiceStatus ?? "N",
    invoice_date: inv.InvoiceDate ?? inv.SystemEntryDate?.slice(0, 10) ?? null,
    due_date: inv.SpecialRegimes?.SelfBillingIndicator ? null : (inv.PaymentTerms ?? null),
    customer_id: String(inv.CustomerID ?? ""),
    currency: docTotals.Currency?.CurrencyCode ?? "EUR",
    gross_total: toNum(docTotals.GrossTotal),
    net_total: toNum(docTotals.NetTotal),
    tax_payable: toNum(docTotals.TaxPayable),
    lines,
    hash: inv.Hash ?? null,
  };
}

// Um recibo SAF-T pode liquidar várias faturas → achatamos em 1 SaftPayment por linha.
export function mapPayment(p: any): SaftPayment[] {
  const out: SaftPayment[] = [];
  const ref = String(p.PaymentRefNo ?? "");
  const date = p.TransactionDate ?? p.SystemEntryDate?.slice(0, 10) ?? "";
  const method = (p.PaymentMethod ?? [])[0]?.PaymentMechanism ?? null;
  const custId = p.CustomerID ? String(p.CustomerID) : null;
  for (const ln of (p.Line ?? []).filter(Boolean)) {
    const invoiceNo = (ln.SourceDocumentID ?? [])[0]?.OriginatingON ?? null;
    const amount = toNum(ln.CreditAmount) - toNum(ln.DebitAmount);
    if (!invoiceNo || amount === 0) continue;
    out.push({
      payment_ref: ref,
      payment_date: date,
      payment_method: method,
      amount,
      invoice_no: String(invoiceNo),
      customer_id: custId,
    });
  }
  return out;
}

export interface SaftStreamHandlers {
  onHeader?: (h: SaftHeader) => void | Promise<void>;
  onCustomer?: (c: SaftCustomer) => void | Promise<void>;
  onProduct?: (p: SaftProduct) => void | Promise<void>;
  onInvoice?: (i: SaftInvoice) => void | Promise<void>;
  onPayment?: (p: SaftPayment) => void | Promise<void>;
  /** Chamado a cada N documentos processados (heartbeat de progresso). */
  onProgress?: (counts: { customers: number; products: number; invoices: number; payments: number }) => void | Promise<void>;
  progressEvery?: number;
}

const TARGETS = ["Header", "Customer", "Product", "Invoice", "Payment"] as const;
type Target = typeof TARGETS[number];

function findOpen(buf: string, tag: string, from: number): { start: number; selfClosing: boolean } | null {
  let idx = from;
  while (true) {
    idx = buf.indexOf(`<${tag}`, idx);
    if (idx === -1) return null;
    const next = buf[idx + tag.length + 1];
    if (next === ">" || next === " " || next === "\t" || next === "\n" || next === "\r" || next === "/") {
      const close = buf.indexOf(">", idx);
      if (close === -1) return null;
      return { start: idx, selfClosing: buf[close - 1] === "/" };
    }
    idx += 1;
  }
}

export function detectEncoding(bytes: Uint8Array): string {
  const head = new TextDecoder("ascii").decode(bytes.slice(0, 200)).toLowerCase();
  const declared = (head.match(/encoding=["']([^"']+)["']/)?.[1] ?? "utf-8").toLowerCase();
  return declared.includes("8859") || declared.includes("1252") || declared.includes("windows")
    ? "windows-1252"
    : "utf-8";
}

/** Descodifica um ReadableStream binário em pedaços de texto, sem duplicar o ficheiro em memória. */
export async function* decodeStream(
  stream: ReadableStream<Uint8Array>,
  encoding: string,
): AsyncGenerator<string> {
  const decoder = new TextDecoder(encoding);
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) yield decoder.decode(value, { stream: true });
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Percorre o SAF-T em streaming. `chunks` é qualquer iterável assíncrono de texto.
 */
export async function streamSaftXml(
  chunks: AsyncIterable<string>,
  handlers: SaftStreamHandlers,
): Promise<{ header: SaftHeader | null; counts: { customers: number; products: number; invoices: number; payments: number } }> {
  let buf = "";
  let header: SaftHeader | null = null;
  let sawAuditFile = false;
  let sawWorkingDocuments = false;
  let sawGeneralLedger = false;
  let headerDone = false;
  const counts = { customers: 0, products: 0, invoices: 0, payments: 0 };
  const progressEvery = handlers.progressEvery ?? 500;
  let sinceProgress = 0;

  const buildHeader = (h: any): SaftHeader => ({
    saft_version: h.AuditFileVersion ?? null,
    software_company: h.SoftwareCompanyName ?? h.ProductCompanyTaxID ?? null,
    software_id: h.ProductID ?? null,
    tax_registration_number: h.TaxRegistrationNumber ? String(h.TaxRegistrationNumber) : null,
    fiscal_year: h.FiscalYear ? Number(h.FiscalYear) : null,
    period_start: h.StartDate ?? null,
    period_end: h.EndDate ?? null,
    saft_type: "billing" as SaftType,
  });

  const drain = async (final: boolean) => {
    while (true) {
      // encontrar o primeiro elemento-alvo presente no buffer
      let best: { tag: Target; start: number } | null = null;
      for (const tag of TARGETS) {
        if (tag === "Header" && headerDone) continue;
        const found = findOpen(buf, tag, 0);
        if (found && (!best || found.start < best.start)) best = { tag, start: found.start };
      }
      if (!best) {
        // nada de interesse: manter apenas a cauda (pode conter uma tag partida)
        if (buf.length > 4096) buf = buf.slice(-4096);
        return;
      }
      const closeTag = `</${best.tag}>`;
      const end = buf.indexOf(closeTag, best.start);
      if (end === -1) {
        // elemento incompleto: descartar o que vem antes e esperar mais dados
        buf = buf.slice(best.start);
        if (final) return;
        return;
      }
      const fragment = buf.slice(best.start, end + closeTag.length);
      buf = buf.slice(end + closeTag.length);

      let obj: any = null;
      try {
        obj = fragmentParser.parse(fragment)?.[best.tag];
      } catch {
        obj = null;
      }
      if (obj) {
        if (best.tag === "Header") {
          header = buildHeader(obj);
          headerDone = true;
          // saft_type só é definitivo no fim (depende de WorkingDocuments / GL)
        } else if (best.tag === "Customer") {
          counts.customers++;
          await handlers.onCustomer?.(mapCustomer(obj));
        } else if (best.tag === "Product") {
          counts.products++;
          await handlers.onProduct?.(mapProduct(obj));
        } else if (best.tag === "Invoice") {
          counts.invoices++;
          await handlers.onInvoice?.(mapInvoice(obj));
        } else if (best.tag === "Payment") {
          const pays = mapPayment(obj);
          counts.payments += pays.length;
          for (const pay of pays) await handlers.onPayment?.(pay);
        }
        sinceProgress++;
        if (sinceProgress >= progressEvery) {
          sinceProgress = 0;
          await handlers.onProgress?.({ ...counts });
        }
      }
    }
  };

  for await (const piece of chunks) {
    if (!buf && piece.charCodeAt(0) === 0xfeff) {
      buf += piece.slice(1);
    } else {
      buf += piece;
    }
    if (!sawAuditFile && buf.includes("<AuditFile")) sawAuditFile = true;
    if (!sawWorkingDocuments && buf.includes("<WorkingDocuments")) sawWorkingDocuments = true;
    if (!sawGeneralLedger && buf.includes("<GeneralLedgerEntries")) sawGeneralLedger = true;
    await drain(false);
  }
  await drain(true);
  buf = "";

  if (!sawAuditFile && !header) {
    throw new Error("Não é um SAF-T válido (AuditFile não encontrado)");
  }
  if (header) {
    (header as SaftHeader).saft_type = sawGeneralLedger
      ? "accounting"
      : sawWorkingDocuments
      ? "self_billing"
      : "billing";
    await handlers.onHeader?.(header);
  }
  await handlers.onProgress?.({ ...counts });
  return { header, counts };
}
