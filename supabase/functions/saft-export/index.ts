import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SAFT-EXPORT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(dateStr: string): string {
  return dateStr.split("T")[0];
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace("Z", "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Not authenticated");

    const { workspaceId, startDate, endDate } = await req.json();
    if (!workspaceId || !startDate || !endDate) throw new Error("Missing required fields");

    logStep("Generating SAF-T", { workspaceId, startDate, endDate });

    // Fetch workspace settings
    const { data: settings } = await supabaseClient
      .from("invoice_settings")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!settings) throw new Error("Invoice settings not configured");

    // Fetch invoices in date range
    const { data: invoices, error: invErr } = await supabaseClient
      .from("invoices")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("issue_date", startDate)
      .lte("issue_date", endDate)
      .neq("status", "draft")
      .order("issue_date");

    if (invErr) throw invErr;
    logStep("Fetched invoices", { count: invoices?.length || 0 });

    // Fetch all items for these invoices
    const invoiceIds = (invoices || []).map((i: any) => i.id);
    let allItems: any[] = [];
    if (invoiceIds.length > 0) {
      const { data: items } = await supabaseClient
        .from("invoice_items")
        .select("*")
        .in("invoice_id", invoiceIds)
        .order("position");
      allItems = items || [];
    }

    // Fetch unique customers (companies + contacts)
    const companyIds = [...new Set((invoices || []).filter((i: any) => i.company_id).map((i: any) => i.company_id))];
    const contactIds = [...new Set((invoices || []).filter((i: any) => i.contact_id).map((i: any) => i.contact_id))];

    let companies: any[] = [];
    let contacts: any[] = [];
    if (companyIds.length > 0) {
      const { data } = await supabaseClient.from("companies").select("id, name, nif, address, city, postal_code, country").in("id", companyIds);
      companies = data || [];
    }
    if (contactIds.length > 0) {
      const { data } = await supabaseClient.from("contacts").select("id, name, email, phone, nif").in("id", contactIds);
      contacts = data || [];
    }

    // Fetch products
    const productIds = [...new Set(allItems.filter(i => i.product_id).map(i => i.product_id))];
    let products: any[] = [];
    if (productIds.length > 0) {
      const { data } = await supabaseClient.from("products").select("id, name, sku, product_type").in("id", productIds);
      products = data || [];
    }

    // Build SAF-T XML
    const now = new Date();
    const fiscalYear = startDate.split("-")[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <CompanyID>${escapeXml(settings.company_nif)}</CompanyID>
    <TaxRegistrationNumber>${escapeXml(settings.company_nif || settings.tax_registration_number)}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${escapeXml(settings.company_name)}</CompanyName>
    <CompanyAddress>
      <AddressDetail>${escapeXml(settings.company_address)}</AddressDetail>
      <City>Lisboa</City>
      <PostalCode>0000-000</PostalCode>
      <Country>PT</Country>
    </CompanyAddress>
    <FiscalYear>${fiscalYear}</FiscalYear>
    <StartDate>${startDate}</StartDate>
    <EndDate>${endDate}</EndDate>
    <CurrencyCode>EUR</CurrencyCode>
    <DateCreated>${formatDate(now.toISOString())}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductCompanyTaxID>${escapeXml(settings.company_nif)}</ProductCompanyTaxID>
    <SoftwareCertificateNumber>0</SoftwareCertificateNumber>
    <ProductID>${escapeXml(settings.saft_product_id || "FastCRM")}/${escapeXml(settings.saft_product_version || "1.0")}</ProductID>
    <ProductVersion>${escapeXml(settings.saft_product_version || "1.0")}</ProductVersion>
    <Telephone>${escapeXml(settings.company_phone)}</Telephone>
    <Email>${escapeXml(settings.company_email)}</Email>
  </Header>
  <MasterFiles>
    ${companies.map((c: any) => `<Customer>
      <CustomerID>${escapeXml(c.id.slice(0, 30))}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>${escapeXml(c.nif || "999999990")}</CustomerTaxID>
      <CompanyName>${escapeXml(c.name)}</CompanyName>
      <BillingAddress>
        <AddressDetail>${escapeXml(c.address || "Desconhecido")}</AddressDetail>
        <City>${escapeXml(c.city || "Desconhecido")}</City>
        <PostalCode>${escapeXml(c.postal_code || "0000-000")}</PostalCode>
        <Country>${escapeXml(c.country || "PT")}</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join("\n    ")}
    ${contacts.map((c: any) => `<Customer>
      <CustomerID>${escapeXml(c.id.slice(0, 30))}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>${escapeXml(c.nif || "999999990")}</CustomerTaxID>
      <CompanyName>${escapeXml(c.name)}</CompanyName>
      <BillingAddress>
        <AddressDetail>Desconhecido</AddressDetail>
        <City>Desconhecido</City>
        <PostalCode>0000-000</PostalCode>
        <Country>PT</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join("\n    ")}
    ${products.map((p: any) => `<Product>
      <ProductType>${p.product_type === "service" ? "S" : "P"}</ProductType>
      <ProductCode>${escapeXml(p.sku || p.id.slice(0, 30))}</ProductCode>
      <ProductDescription>${escapeXml(p.name)}</ProductDescription>
      <ProductNumberCode>${escapeXml(p.sku || p.id.slice(0, 30))}</ProductNumberCode>
    </Product>`).join("\n    ")}
  </MasterFiles>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${(invoices || []).length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${(invoices || []).reduce((s: number, i: any) => s + Number(i.total || 0), 0).toFixed(2)}</TotalCredit>
      ${(invoices || []).map((inv: any, idx: number) => {
        const invItems = allItems.filter(it => it.invoice_id === inv.id);
        const docType = inv.document_type === "credit_note" ? "NC" : inv.document_type === "simplified_invoice" ? "FS" : inv.document_type === "receipt" ? "RC" : "FT";
        const customerId = inv.company_id || inv.contact_id || "Consumidor";

        return `<Invoice>
        <InvoiceNo>${escapeXml(inv.invoice_number)}</InvoiceNo>
        <ATCUD>${escapeXml(inv.atcud || "0")}</ATCUD>
        <DocumentStatus>
          <InvoiceStatus>${inv.status === "cancelled" || inv.fiscal_status === "cancelled" ? "A" : "N"}</InvoiceStatus>
          <InvoiceStatusDate>${formatDateTime(inv.updated_at)}</InvoiceStatusDate>
          <SourceID>${escapeXml(inv.created_by?.slice(0, 30) || "System")}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>${escapeXml(inv.hash_control || "0")}</Hash>
        <HashControl>1</HashControl>
        <Period>${new Date(inv.issue_date).getMonth() + 1}</Period>
        <InvoiceDate>${formatDate(inv.issue_date)}</InvoiceDate>
        <InvoiceType>${docType}</InvoiceType>
        <SpecialRegimes>
          <SelfBillingIndicator>0</SelfBillingIndicator>
          <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
          <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
        </SpecialRegimes>
        <SourceID>${escapeXml(inv.created_by?.slice(0, 30) || "System")}</SourceID>
        <SystemEntryDate>${formatDateTime(inv.created_at)}</SystemEntryDate>
        <CustomerID>${escapeXml(String(customerId).slice(0, 30))}</CustomerID>
        ${invItems.map((item: any, lineIdx: number) => {
          const netTotal = Number(item.total || 0);
          const taxRate = Number(item.tax_rate || 0);
          const taxAmount = Number(item.tax_amount || (netTotal * taxRate / 100));

          return `<Line>
          <LineNumber>${lineIdx + 1}</LineNumber>
          <ProductCode>${escapeXml(item.product_id?.slice(0, 30) || `ITEM-${lineIdx + 1}`)}</ProductCode>
          <ProductDescription>${escapeXml(item.description)}</ProductDescription>
          <Quantity>${Number(item.quantity).toFixed(2)}</Quantity>
          <UnitOfMeasure>UN</UnitOfMeasure>
          <UnitPrice>${Number(item.unit_price).toFixed(4)}</UnitPrice>
          <TaxPointDate>${formatDate(inv.issue_date)}</TaxPointDate>
          <Description>${escapeXml(item.description)}</Description>
          ${docType === "NC" ? `<DebitAmount>${netTotal.toFixed(2)}</DebitAmount>` : `<CreditAmount>${netTotal.toFixed(2)}</CreditAmount>`}
          <Tax>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>PT</TaxCountryRegion>
            <TaxCode>${taxRate === 0 ? "ISE" : taxRate === 6 ? "RED" : taxRate === 13 ? "INT" : "NOR"}</TaxCode>
            <TaxPercentage>${taxRate.toFixed(2)}</TaxPercentage>
          </Tax>
          ${taxRate === 0 && inv.vat_exemption_reason ? `<TaxExemptionReason>${escapeXml(inv.vat_exemption_reason)}</TaxExemptionReason>
          <TaxExemptionCode>M99</TaxExemptionCode>` : ""}
        </Line>`;
        }).join("\n        ")}
        <DocumentTotals>
          <TaxPayable>${Number(inv.tax_amount || 0).toFixed(2)}</TaxPayable>
          <NetTotal>${Number(inv.subtotal || 0).toFixed(2)}</NetTotal>
          <GrossTotal>${Number(inv.total || 0).toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`;
      }).join("\n      ")}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

    logStep("SAF-T generated", { size: xml.length });

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="SAFT-PT_${fiscalYear}_${startDate}_${endDate}.xml"`,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
