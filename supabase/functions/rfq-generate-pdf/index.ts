import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "npm:jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) throw new Error("Unauthorized");
    }

    const { rfq_id } = await req.json();
    if (!rfq_id) throw new Error("rfq_id required");

    // Fetch all data
    const [rfqRes, itemsRes, suppliersRes, quotesRes] = await Promise.all([
      supabase.from("rfqs").select("*").eq("id", rfq_id).single(),
      supabase.from("rfq_items").select("*, products:product_id(name, sku)").eq("rfq_id", rfq_id).order("created_at"),
      supabase.from("rfq_suppliers").select("*, suppliers:supplier_id(name, email)").eq("rfq_id", rfq_id),
      supabase.from("rfq_quotes").select("*, suppliers:supplier_id(name)").eq("rfq_id", rfq_id),
    ]);

    if (rfqRes.error) throw rfqRes.error;
    const rfq = rfqRes.data;
    const items = itemsRes.data || [];
    const suppliers = suppliersRes.data || [];
    const quotes = quotesRes.data || [];

    // Fetch workspace
    const { data: ws } = await supabase.from("workspaces").select("company_name, tax_id, billing_address, phone").eq("id", rfq.workspace_id).single();

    // Generate PDF
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    const addPage = () => { doc.addPage(); y = 20; };
    const checkPage = (need: number) => { if (y + need > 280) addPage(); };

    // ---- HEADER ----
    doc.setFillColor(24, 24, 27); // zinc-900
    doc.rect(0, 0, pageW, 45, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PEDIDO DE COTAÇÃO", 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (rfq.rfq_number) doc.text(`Nº ${rfq.rfq_number}`, 14, 26);
    doc.text(`Estado: ${rfq.status?.toUpperCase()}`, 14, 32);
    doc.text(`Moeda: ${rfq.currency || "EUR"}`, 14, 38);

    // Right side
    doc.text(`Data: ${new Date(rfq.created_at).toLocaleDateString("pt-PT")}`, pageW - 60, 26);
    if (rfq.due_date) doc.text(`Prazo: ${rfq.due_date}`, pageW - 60, 32);
    if (rfq.quote_validity_days) doc.text(`Validade: ${rfq.quote_validity_days} dias`, pageW - 60, 38);

    doc.setTextColor(0, 0, 0);
    y = 55;

    // ---- BUYER INFO ----
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO COMPRADOR", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const buyerLines: string[] = [];
    if (ws?.company_name) buyerLines.push(`Empresa: ${ws.company_name}`);
    if (ws?.tax_id) buyerLines.push(`NIF: ${ws.tax_id}`);
    if (ws?.billing_address) buyerLines.push(`Morada: ${ws.billing_address}`);
    if (ws?.phone) buyerLines.push(`Telefone: ${ws.phone}`);
    if (rfq.buyer_name) buyerLines.push(`Comprador: ${rfq.buyer_name}`);
    if (rfq.buyer_email) buyerLines.push(`Email: ${rfq.buyer_email}`);
    if (rfq.payment_terms) buyerLines.push(`Condições Pagamento: ${rfq.payment_terms}`);
    if (rfq.delivery_location) buyerLines.push(`Local Entrega: ${rfq.delivery_location}`);
    if (rfq.incoterm) buyerLines.push(`Incoterm: ${rfq.incoterm}`);

    buyerLines.forEach(line => { doc.text(line, 14, y); y += 5; });
    y += 5;

    // ---- SUPPLIERS TABLE ----
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("FORNECEDORES CONVIDADOS", 14, y);
    y += 7;

    if (suppliers.length > 0) {
      // Header row
      doc.setFillColor(243, 244, 246);
      doc.rect(14, y - 4, pageW - 28, 7, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Fornecedor", 16, y);
      doc.text("Email", 70, y);
      doc.text("Estado", 130, y);
      doc.text("Enviado", 155, y);
      doc.text("Respondido", 178, y);
      y += 6;
      doc.setFont("helvetica", "normal");

      suppliers.forEach((s: any) => {
        checkPage(6);
        doc.text(String(s.suppliers?.name || "—"), 16, y);
        doc.text(String(s.suppliers?.email || "—"), 70, y);
        doc.text(String(s.status || "—"), 130, y);
        doc.text(s.sent_at ? new Date(s.sent_at).toLocaleDateString("pt-PT") : "—", 155, y);
        doc.text(s.responded_at ? new Date(s.responded_at).toLocaleDateString("pt-PT") : "—", 178, y);
        y += 5;
      });
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text("Nenhum fornecedor adicionado.", 14, y);
      y += 5;
    }
    y += 8;

    // ---- ITEMS TABLE ----
    checkPage(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ITENS", 14, y);
    y += 7;

    // Header
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y - 4, pageW - 28, 7, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const cols = [
      { label: "#", x: 16 },
      { label: "Produto", x: 24 },
      { label: "SKU", x: 72 },
      { label: "Qtd", x: 102 },
      { label: "Un", x: 115 },
      { label: "Notas", x: 128 },
    ];
    cols.forEach(c => doc.text(c.label, c.x, y));
    y += 6;
    doc.setFont("helvetica", "normal");

    items.forEach((item: any, idx: number) => {
      checkPage(6);
      doc.text(String(item.line_number || idx + 1), 16, y);
      doc.text(String(item.products?.name || "—").substring(0, 30), 24, y);
      doc.text(String(item.products?.sku || "—").substring(0, 18), 72, y);
      doc.text(String(item.qty), 102, y);
      doc.text(String(item.unit || "un"), 115, y);
      doc.text(String(item.spec_notes || "").substring(0, 30), 128, y);
      y += 5;
    });

    // ---- QUOTES (if any) ----
    if (quotes.length > 0) {
      y += 8;
      checkPage(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("COTAÇÕES RECEBIDAS", 14, y);
      y += 7;

      doc.setFillColor(243, 244, 246);
      doc.rect(14, y - 4, pageW - 28, 7, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Fornecedor", 16, y);
      doc.text("Preço Unit.", 60, y);
      doc.text("Desc.%", 85, y);
      doc.text("IVA%", 102, y);
      doc.text("Lead Time", 118, y);
      doc.text("MOQ", 140, y);
      doc.text("Pack", 155, y);
      doc.text("Notas", 168, y);
      y += 6;
      doc.setFont("helvetica", "normal");

      quotes.forEach((q: any) => {
        checkPage(6);
        doc.text(String(q.suppliers?.name || "—").substring(0, 25), 16, y);
        doc.text(String(Number(q.unit_price).toFixed(2)), 60, y);
        doc.text(String(q.discount_percent || 0), 85, y);
        doc.text(String(q.vat_percent || 23), 102, y);
        doc.text(q.lead_time_days ? `${q.lead_time_days}d` : "—", 118, y);
        doc.text(q.min_order_qty ? String(q.min_order_qty) : "—", 140, y);
        doc.text(q.pack_size ? String(q.pack_size) : "—", 155, y);
        doc.text(String(q.notes || "").substring(0, 15), 168, y);
        y += 5;
      });
    }

    // ---- FOOTER ----
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(140, 140, 140);
      doc.text("Documento gerado automaticamente pelo FastCRM. Este pedido de cotação não constitui compromisso de compra.", 14, 290);
      doc.text(`Página ${i} de ${totalPages}`, pageW - 30, 290);
      doc.setTextColor(0, 0, 0);
    }

    // Export to buffer
    const pdfOutput = doc.output("arraybuffer");
    const pdfBytes = new Uint8Array(pdfOutput);

    // Upload to storage
    const fileName = `${rfq.workspace_id}/${rfq.id}/${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("rfq-pdfs")
      .upload(fileName, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw uploadError;

    // Update rfq with pdf_url
    await supabase.from("rfqs").update({ pdf_url: fileName } as any).eq("id", rfq_id);

    return new Response(JSON.stringify({ pdf_url: fileName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rfq-generate-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
