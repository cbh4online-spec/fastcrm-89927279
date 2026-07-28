// Leitor SAF-T PT incremental (streaming).
// Percorre o XML por blocos e emite cada <Customer>, <Product>, <Invoice> e
// <Payment> assim que o elemento fecha, sem nunca construir a árvore completa
// em memória. Mantém exatamente os mesmos tipos do saft-parser legado.
import type {
  SaftCustomer,
  SaftHeader,
  SaftInvoice,
  SaftInvoiceLine,
  SaftPayment,
  SaftProduct,
  SaftType,
} from "./saft-parser.ts";

export function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function unescapeXml(v: string | null): string | null {
  if (v == null) return null;
  return v
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagValue(xml: string, tag: string): string | null {
  const re = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, "i");
  return unescapeXml(xml.match(re)?.[1] ?? null);
}

function tagFragment(xml: string, tag: string): string | null {
  const re = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/(?:\\w+:)?${tag}>`, "i");
  return xml.match(re)?.[0] ?? null;
}

function tagFragments(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/(?:\\w+:)?${tag}>`, "gi");
  return xml.match(re) ?? [];
}

function countTags(xml: string, tag: string): number {
  const re = new RegExp(`<(?:\\w+:)?${tag}(?:\\s|>)`, "gi");
  return xml.match(re)?.length ?? 0;
}

function parseLine(l: string, idx: number): SaftInvoiceLine {
  const qty = toNum(tagValue(l, "Quantity"));
  const unit = toNum(tagValue(l, "UnitPrice"));
  const taxFrag = tagFragment(l, "Tax") ?? "";
  const taxPct = toNum(tagValue(taxFrag, "TaxPercentage"));
  const credit = toNum(tagValue(l, "CreditAmount"));
  const debit = toNum(tagValue(l, "DebitAmount"));
  const lineNet = credit || debit || qty * unit;
  const taxAmount = (lineNet * taxPct) / 100;
  return {
    line_number: Number(tagValue(l, "LineNumber") ?? idx + 1),
    product_code: tagValue(l, "ProductCode"),
    description: tagValue(l, "Description") ?? "",
    quantity: qty,
    unit_price: unit,
    tax_percentage: taxPct,
    tax_amount: taxAmount,
    line_total: lineNet + taxAmount,
  };
}

function parseHeaderXml(h: string): SaftHeader {
  return {
    saft_version: tagValue(h, "AuditFileVersion"),
    software_company: tagValue(h, "SoftwareCompanyName") ?? tagValue(h, "ProductCompanyTaxID"),
    software_id: tagValue(h, "ProductID"),
    tax_registration_number: tagValue(h, "TaxRegistrationNumber"),
    fiscal_year: tagValue(h, "FiscalYear") ? Number(tagValue(h, "FiscalYear")) : null,
    period_start: tagValue(h, "StartDate"),
    period_end: tagValue(h, "EndDate"),
    saft_type: "billing" as SaftType,
  };
}

function parseCustomerXml(c: string): SaftCustomer {
  const addr = tagFragment(c, "BillingAddress") ?? tagFragment(c, "CompanyAddress") ?? "";
  return {
    customer_id: String(tagValue(c, "CustomerID") ?? ""),
    name: tagValue(c, "CompanyName") ?? "",
    tax_id: tagValue(c, "CustomerTaxID"),
    email: tagValue(c, "Email"),
    phone: tagValue(c, "Telephone"),
    address: tagValue(addr, "AddressDetail"),
    city: tagValue(addr, "City"),
    postal_code: tagValue(addr, "PostalCode"),
    country: tagValue(addr, "Country"),
  };
}

function parseProductXml(p: string): SaftProduct {
  return {
    product_code: String(tagValue(p, "ProductCode") ?? ""),
    product_description: tagValue(p, "ProductDescription") ?? "",
    product_type: tagValue(p, "ProductType"),
  };
}

function parseInvoiceXml(inv: string, includeLines = true): SaftInvoice & { line_count?: number } {
  const docTotals = tagFragment(inv, "DocumentTotals") ?? "";
  const docStatus = tagFragment(inv, "DocumentStatus") ?? "";
  const currency = tagFragment(docTotals, "Currency") ?? "";
  const line_count = countTags(inv, "Line");
  return {
    invoice_no: String(tagValue(inv, "InvoiceNo") ?? ""),
    atcud: tagValue(inv, "ATCUD"),
    invoice_type: tagValue(inv, "InvoiceType") ?? "FT",
    invoice_status: tagValue(docStatus, "InvoiceStatus") ?? "N",
    invoice_date: tagValue(inv, "InvoiceDate") ?? tagValue(inv, "SystemEntryDate")?.slice(0, 10) ?? null,
    due_date: tagValue(inv, "SelfBillingIndicator") ? null : tagValue(inv, "PaymentTerms"),
    customer_id: String(tagValue(inv, "CustomerID") ?? ""),
    currency: tagValue(currency, "CurrencyCode") ?? "EUR",
    gross_total: toNum(tagValue(docTotals, "GrossTotal")),
    net_total: toNum(tagValue(docTotals, "NetTotal")),
    tax_payable: toNum(tagValue(docTotals, "TaxPayable")),
    lines: includeLines ? tagFragments(inv, "Line").map(parseLine) : [],
    line_count,
    hash: tagValue(inv, "Hash"),
  };
}

function parseWorkDocumentXml(doc: string, includeLines = true): SaftInvoice & { line_count?: number } {
  const docTotals = tagFragment(doc, "DocumentTotals") ?? "";
  const docStatus = tagFragment(doc, "DocumentStatus") ?? "";
  const currency = tagFragment(docTotals, "Currency") ?? "";
  const line_count = countTags(doc, "Line");
  return {
    invoice_no: String(tagValue(doc, "DocumentNumber") ?? tagValue(doc, "WorkDocumentNumber") ?? tagValue(doc, "WorkDocumentNo") ?? tagValue(doc, "InvoiceNo") ?? ""),
    atcud: tagValue(doc, "ATCUD"),
    invoice_type: tagValue(doc, "WorkType") ?? tagValue(doc, "DocumentType") ?? "WD",
    invoice_status: tagValue(docStatus, "WorkStatus") ?? tagValue(docStatus, "InvoiceStatus") ?? "N",
    invoice_date: tagValue(doc, "WorkDate") ?? tagValue(doc, "InvoiceDate") ?? tagValue(doc, "SystemEntryDate")?.slice(0, 10) ?? null,
    due_date: tagValue(doc, "PaymentTerms"),
    customer_id: String(tagValue(doc, "CustomerID") ?? ""),
    currency: tagValue(currency, "CurrencyCode") ?? "EUR",
    gross_total: toNum(tagValue(docTotals, "GrossTotal")),
    net_total: toNum(tagValue(docTotals, "NetTotal")),
    tax_payable: toNum(tagValue(docTotals, "TaxPayable")),
    lines: includeLines ? tagFragments(doc, "Line").map(parseLine) : [],
    line_count,
    hash: tagValue(doc, "Hash"),
  };
}

function parsePaymentXml(p: string): SaftPayment[] {
  const out: SaftPayment[] = [];
  const ref = String(tagValue(p, "PaymentRefNo") ?? "");
  const date = tagValue(p, "TransactionDate") ?? tagValue(p, "SystemEntryDate")?.slice(0, 10) ?? "";
  const method = tagValue(tagFragment(p, "PaymentMethod") ?? "", "PaymentMechanism");
  const custId = tagValue(p, "CustomerID");
  for (const ln of tagFragments(p, "Line")) {
    const invoiceNo = tagValue(tagFragment(ln, "SourceDocumentID") ?? "", "OriginatingON");
    const amount = toNum(tagValue(ln, "CreditAmount")) - toNum(tagValue(ln, "DebitAmount"));
    if (!invoiceNo || amount === 0) continue;
    out.push({ payment_ref: ref, payment_date: date, payment_method: method, amount, invoice_no: String(invoiceNo), customer_id: custId });
  }
  return out;
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

// SAF-T de autofaturação/WorkingDocuments usa <WorkDocument> em vez de
// <SalesInvoices><Invoice>. Para o motor de importação interno tratamos estes
// documentos como faturas normalizadas, preservando o número/tipo/estado.
export function mapWorkDocument(doc: any): SaftInvoice {
  const docTotals = doc.DocumentTotals ?? {};
  const status = doc.DocumentStatus ?? {};
  const lines: SaftInvoiceLine[] = (doc.Line ?? []).filter(Boolean).map((l: any, idx: number) => {
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
    invoice_no: String(doc.DocumentNumber ?? doc.WorkDocumentNumber ?? doc.WorkDocumentNo ?? doc.InvoiceNo ?? ""),
    atcud: doc.ATCUD ?? null,
    invoice_type: doc.WorkType ?? doc.DocumentType ?? "WD",
    invoice_status: status.WorkStatus ?? status.InvoiceStatus ?? "N",
    invoice_date: doc.WorkDate ?? doc.InvoiceDate ?? doc.SystemEntryDate?.slice(0, 10) ?? null,
    due_date: doc.PaymentTerms ?? null,
    customer_id: String(doc.CustomerID ?? ""),
    currency: docTotals.Currency?.CurrencyCode ?? "EUR",
    gross_total: toNum(docTotals.GrossTotal),
    net_total: toNum(docTotals.NetTotal),
    tax_payable: toNum(docTotals.TaxPayable),
    lines,
    hash: doc.Hash ?? null,
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
  includeInvoiceLines?: boolean;
}

const TARGETS = ["Header", "Customer", "Product", "Invoice", "WorkDocument", "Payment"] as const;
type Target = typeof TARGETS[number];

function findBestOpen(buf: string, from: number, skipHeader: boolean): { tag: Target; start: number; end: number; selfClosing: boolean } | null {
  let best: { tag: Target; start: number; end: number; selfClosing: boolean } | null = null;
  for (const tag of TARGETS) {
    if (tag === "Header" && skipHeader) continue;
    const found = findOpen(buf, tag, from);
    if (found && (!best || found.start < best.start)) best = { tag, ...found };
  }
  return best;
}

function findOpen(buf: string, tag: string, from: number): { start: number; end: number; selfClosing: boolean } | null {
  let idx = from;
  while (true) {
    idx = buf.indexOf(`<${tag}`, idx);
    if (idx === -1) return null;
    const next = buf[idx + tag.length + 1];
    if (next === ">" || next === " " || next === "\t" || next === "\n" || next === "\r" || next === "/") {
      const close = buf.indexOf(">", idx);
      if (close === -1) return null;
      return { start: idx, end: close, selfClosing: buf[close - 1] === "/" };
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
  const maxPendingFragment = 512 * 1024;

  const drain = async (final: boolean) => {
    while (true) {
      // encontrar o primeiro elemento-alvo presente no buffer
      const best = findBestOpen(buf, 0, headerDone);
      if (!best) {
        // nada de interesse: manter apenas a cauda (pode conter uma tag partida)
        if (buf.length > 4096) buf = buf.slice(-4096);
        return;
      }
      if (best.selfClosing) {
        buf = buf.slice(best.end + 1);
        continue;
      }
      const closeTag = `</${best.tag}>`;
      const end = buf.indexOf(closeTag, best.start);
      if (end === -1) {
        // Elemento incompleto: pode ser só uma tag partida entre chunks, mas em
        // alguns SAF-T reais aparecem sequências inválidas que parecem um alvo e
        // nunca fecham. Se já existe outro alvo mais à frente, descartamos o falso
        // positivo; se o fragmento cresce demasiado, falhamos de forma controlada
        // em vez de deixar o worker rebentar por memória.
        const next = findBestOpen(buf, best.end + 1, headerDone);
        if (next) {
          buf = buf.slice(next.start);
          continue;
        }
        buf = buf.slice(best.start);
        if (buf.length > maxPendingFragment) {
          throw new Error(`Fragmento XML incompleto em <${best.tag}> excedeu o limite seguro de leitura`);
        }
        if (final) return;
        return;
      }
      const fragment = buf.slice(best.start, end + closeTag.length);
      buf = buf.slice(end + closeTag.length);

      try {
        if (best.tag === "Header") {
          header = parseHeaderXml(fragment);
          headerDone = true;
          // saft_type só é definitivo no fim (depende de WorkingDocuments / GL)
        } else if (best.tag === "Customer") {
          counts.customers++;
          await handlers.onCustomer?.(parseCustomerXml(fragment));
        } else if (best.tag === "Product") {
          counts.products++;
          await handlers.onProduct?.(parseProductXml(fragment));
        } else if (best.tag === "Invoice") {
          counts.invoices++;
          await handlers.onInvoice?.(parseInvoiceXml(fragment, handlers.includeInvoiceLines !== false));
        } else if (best.tag === "WorkDocument") {
          counts.invoices++;
          await handlers.onInvoice?.(parseWorkDocumentXml(fragment, handlers.includeInvoiceLines !== false));
        } else if (best.tag === "Payment") {
          const pays = parsePaymentXml(fragment);
          counts.payments += pays.length;
          for (const pay of pays) await handlers.onPayment?.(pay);
        }
      } catch {
        // Fragmento inválido ou inesperado: ignorar e continuar a stream para
        // evitar bloquear toda a importação por um elemento defeituoso.
      }
      sinceProgress++;
      if (sinceProgress >= progressEvery) {
        sinceProgress = 0;
        await handlers.onProgress?.({ ...counts });
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

/**
 * Conveniência: percorre o stream e devolve a estrutura completa (SaftParsed).
 * Usa muito menos memória que o parser legado porque nunca cria a árvore XML.
 */
export async function collectSaftStream(
  chunks: AsyncIterable<string>,
  onProgress?: SaftStreamHandlers["onProgress"],
) {
  const customers: SaftCustomer[] = [];
  const products: SaftProduct[] = [];
  const invoices: SaftInvoice[] = [];
  const payments: SaftPayment[] = [];
  const { header } = await streamSaftXml(chunks, {
    onCustomer: (c) => { customers.push(c); },
    onProduct: (p) => { products.push(p); },
    onInvoice: (i) => { invoices.push(i); },
    onPayment: (p) => { payments.push(p); },
    onProgress,
  });
  if (!header) throw new Error("Não é um SAF-T válido (Header não encontrado)");
  return { header, customers, products, invoices, payments };
}
