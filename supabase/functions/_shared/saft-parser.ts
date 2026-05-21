// Shared SAF-T PT parser utilities (Deno)
import { XMLParser } from "npm:fast-xml-parser@4.4.1";

export type SaftType = "billing" | "accounting" | "self_billing";

export interface SaftHeader {
  saft_version: string | null;
  software_company: string | null;
  software_id: string | null;
  tax_registration_number: string | null;
  fiscal_year: number | null;
  period_start: string | null;
  period_end: string | null;
  saft_type: SaftType;
}

export interface SaftCustomer {
  customer_id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface SaftProduct {
  product_code: string;
  product_description: string;
  product_type: string | null;
}

export interface SaftInvoiceLine {
  line_number: number;
  product_code: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_percentage: number;
  tax_amount: number;
  line_total: number;
}

export interface SaftInvoice {
  invoice_no: string;
  atcud: string | null;
  invoice_type: string;
  invoice_status: string;
  invoice_date: string;
  due_date: string | null;
  customer_id: string;
  currency: string;
  gross_total: number;
  net_total: number;
  tax_payable: number;
  lines: SaftInvoiceLine[];
  hash: string | null;
}

export interface SaftPayment {
  payment_ref: string;
  payment_date: string;
  payment_method: string | null;
  amount: number;
  invoice_no: string | null;
  customer_id: string | null;
}

export interface SaftParsed {
  header: SaftHeader;
  customers: SaftCustomer[];
  products: SaftProduct[];
  invoices: SaftInvoice[];
  payments: SaftPayment[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
  isArray: (name) => [
    "Customer", "Product", "Invoice", "Line", "Payment",
    "WorkDocument", "StockMovement",
  ].includes(name),
});

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

function detectType(audit: any): SaftType {
  const src = audit?.SourceDocuments;
  if (audit?.GeneralLedgerEntries) return "accounting";
  if (src?.WorkingDocuments?.WorkDocument) return "self_billing";
  return "billing";
}

export function parseSaftXml(xml: string): SaftParsed {
  // Strip BOM
  if (xml.charCodeAt(0) === 0xfeff) xml = xml.slice(1);
  const json = parser.parse(xml);
  const audit = json?.AuditFile;
  if (!audit) throw new Error("Não é um SAF-T válido (AuditFile não encontrado)");

  const h = audit.Header ?? {};
  const period = h.FiscalYear ? Number(h.FiscalYear) : null;
  const header: SaftHeader = {
    saft_version: h.AuditFileVersion ?? null,
    software_company: h.SoftwareCompanyName ?? h.ProductCompanyTaxID ?? null,
    software_id: h.ProductID ?? null,
    tax_registration_number: h.TaxRegistrationNumber ? String(h.TaxRegistrationNumber) : null,
    fiscal_year: period,
    period_start: h.StartDate ?? null,
    period_end: h.EndDate ?? null,
    saft_type: detectType(audit),
  };

  // Customers
  const customers: SaftCustomer[] = (audit.MasterFiles?.Customer ?? []).map((c: any) => {
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
  });

  // Products
  const products: SaftProduct[] = (audit.MasterFiles?.Product ?? []).map((p: any) => ({
    product_code: String(p.ProductCode ?? ""),
    product_description: p.ProductDescription ?? "",
    product_type: p.ProductType ?? null,
  }));

  // Invoices
  const salesInv = audit.SourceDocuments?.SalesInvoices?.Invoice ?? [];
  const invoices: SaftInvoice[] = salesInv.map((inv: any) => {
    const docTotals = inv.DocumentTotals ?? {};
    const lines: SaftInvoiceLine[] = (inv.Line ?? []).map((l: any, idx: number) => {
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
  });

  // Payments
  const pays = audit.SourceDocuments?.Payments?.Payment ?? [];
  const payments: SaftPayment[] = (Array.isArray(pays) ? pays : [pays]).filter(Boolean).map((p: any) => ({
    payment_ref: String(p.PaymentRefNo ?? ""),
    payment_date: p.TransactionDate ?? p.SystemEntryDate?.slice(0, 10) ?? "",
    payment_method: p.PaymentMethod?.PaymentMechanism ?? null,
    amount: toNum(p.DocumentTotals?.GrossTotal),
    invoice_no: p.Line?.SourceDocumentID?.OriginatingON ?? null,
    customer_id: p.CustomerID ? String(p.CustomerID) : null,
  }));

  return { header, customers, products, invoices, payments };
}

export function computeStats(parsed: SaftParsed) {
  return {
    customers: parsed.customers.length,
    products: parsed.products.length,
    invoices: parsed.invoices.length,
    invoice_lines: parsed.invoices.reduce((s, i) => s + i.lines.length, 0),
    payments: parsed.payments.length,
    total_gross: parsed.invoices.reduce((s, i) => s + i.gross_total, 0),
    total_net: parsed.invoices.reduce((s, i) => s + i.net_total, 0),
    total_tax: parsed.invoices.reduce((s, i) => s + i.tax_payable, 0),
    cancelled: parsed.invoices.filter(i => i.invoice_status === "A").length,
  };
}
