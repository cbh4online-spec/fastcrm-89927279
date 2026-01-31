import { useCallback } from "react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { orderNoteStatusConfig, type OrderNote } from "@/types/order-note";

interface UseOrderNotePDFOptions {
  workspaceName?: string;
  workspaceLogo?: string;
}

export function useOrderNotePDF(options: UseOrderNotePDFOptions = {}) {
  const { workspaceName = "Empresa", workspaceLogo } = options;

  const generatePDF = useCallback((order: OrderNote) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Colors
    const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
    const textColor: [number, number, number] = [55, 65, 81];
    const mutedColor: [number, number, number] = [107, 114, 128];

    // Helper function for text
    const addText = (
      text: string, 
      x: number, 
      yPos: number, 
      options?: { 
        fontSize?: number; 
        fontStyle?: "normal" | "bold" | "italic"; 
        color?: [number, number, number];
        align?: "left" | "center" | "right";
      }
    ) => {
      const { fontSize = 10, fontStyle = "normal", color = textColor, align = "left" } = options || {};
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      doc.setTextColor(...color);
      
      let xPos = x;
      if (align === "center") {
        xPos = pageWidth / 2;
      } else if (align === "right") {
        xPos = pageWidth - margin;
      }
      
      doc.text(text, xPos, yPos, { align });
    };

    // Header
    addText(workspaceName, margin, y, { fontSize: 18, fontStyle: "bold", color: primaryColor });
    addText("NOTA DE ENCOMENDA", pageWidth - margin, y, { fontSize: 14, fontStyle: "bold", align: "right" });
    y += 8;
    addText(order.order_number, pageWidth - margin, y, { fontSize: 12, fontStyle: "bold", align: "right", color: primaryColor });
    y += 15;

    // Horizontal line
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Order Info Section
    const statusConfig = orderNoteStatusConfig[order.status];
    const orderDate = order.submitted_at 
      ? format(new Date(order.submitted_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })
      : format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt });

    addText("Data:", margin, y, { fontSize: 10, color: mutedColor });
    addText(orderDate, margin + 30, y, { fontSize: 10 });
    y += 6;
    addText("Estado:", margin, y, { fontSize: 10, color: mutedColor });
    addText(statusConfig.labelPT, margin + 30, y, { fontSize: 10 });
    y += 15;

    // Client Info Section
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 45, 3, 3, "F");
    
    addText("DADOS DO CLIENTE", margin + 5, y + 5, { fontSize: 11, fontStyle: "bold" });
    y += 12;
    
    if (order.client_user) {
      addText(`Nome: ${order.client_user.name}`, margin + 5, y, { fontSize: 10 });
      y += 6;
      addText(`Email: ${order.client_user.email}`, margin + 5, y, { fontSize: 10 });
      y += 6;
      if (order.client_user.tax_id) {
        addText(`NIF: ${order.client_user.tax_id}`, margin + 5, y, { fontSize: 10 });
        y += 6;
      }
    }

    // Billing address
    if (order.billing_address && Object.keys(order.billing_address).length > 0) {
      const addr = order.billing_address;
      const addressParts = [addr.street, `${addr.postal_code || ""} ${addr.city || ""}`.trim(), addr.country].filter(Boolean);
      if (addressParts.length > 0) {
        addText(`Morada: ${addressParts.join(", ")}`, margin + 5, y, { fontSize: 10 });
      }
    }
    
    y += 20;

    // Products Table
    addText("PRODUTOS", margin, y, { fontSize: 11, fontStyle: "bold" });
    y += 8;

    // Table Header
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 10, 2, 2, "F");
    
    const colWidths = { ref: 25, product: 70, qty: 20, price: 25, subtotal: 30 };
    let xPos = margin + 3;
    
    addText("Ref.", xPos, y + 2, { fontSize: 9, fontStyle: "bold" });
    xPos += colWidths.ref;
    addText("Produto", xPos, y + 2, { fontSize: 9, fontStyle: "bold" });
    xPos += colWidths.product;
    addText("Qtd", xPos, y + 2, { fontSize: 9, fontStyle: "bold" });
    xPos += colWidths.qty;
    addText("Preço Unit.", xPos, y + 2, { fontSize: 9, fontStyle: "bold" });
    xPos += colWidths.price;
    addText("Subtotal", xPos, y + 2, { fontSize: 9, fontStyle: "bold" });
    
    y += 12;

    // Table Rows
    (order.items || []).forEach((item) => {
      // Check if we need a new page
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      xPos = margin + 3;
      
      addText(item.product_sku || "-", xPos, y, { fontSize: 9 });
      xPos += colWidths.ref;
      
      // Truncate long product names
      const productName = item.product_name.length > 35 
        ? item.product_name.substring(0, 32) + "..." 
        : item.product_name;
      addText(productName, xPos, y, { fontSize: 9 });
      xPos += colWidths.product;
      
      addText(item.quantity.toString(), xPos, y, { fontSize: 9 });
      xPos += colWidths.qty;
      
      addText(`€${item.unit_price_net.toFixed(2)}`, xPos, y, { fontSize: 9 });
      xPos += colWidths.price;
      
      addText(`€${item.line_total_net.toFixed(2)}`, xPos, y, { fontSize: 9 });
      
      y += 7;

      // Light separator line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.1);
      doc.line(margin, y - 2, pageWidth - margin, y - 2);
    });

    y += 10;

    // Totals Section
    const totalsX = pageWidth - margin - 60;
    
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.3);
    doc.line(totalsX - 10, y - 5, pageWidth - margin, y - 5);
    
    addText("Subtotal (s/IVA):", totalsX, y, { fontSize: 10 });
    addText(`€${order.total_net.toFixed(2)}`, pageWidth - margin, y, { fontSize: 10, align: "right" });
    y += 7;
    
    addText("IVA:", totalsX, y, { fontSize: 10 });
    addText(`€${order.total_vat.toFixed(2)}`, pageWidth - margin, y, { fontSize: 10, align: "right" });
    y += 7;
    
    doc.setLineWidth(0.3);
    doc.line(totalsX - 10, y, pageWidth - margin, y);
    y += 5;
    
    addText("TOTAL:", totalsX, y, { fontSize: 12, fontStyle: "bold" });
    addText(`€${order.total_gross.toFixed(2)}`, pageWidth - margin, y, { fontSize: 12, fontStyle: "bold", align: "right", color: primaryColor });
    y += 15;

    // Installment Info (if applicable)
    if (order.installment_requested && order.installment_count) {
      doc.setFillColor(254, 243, 199); // Amber background
      doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 25, 3, 3, "F");
      
      addText("PAGAMENTO EM PRESTAÇÕES", margin + 5, y + 3, { fontSize: 10, fontStyle: "bold", color: [146, 64, 14] });
      y += 10;
      addText(`${order.installment_count}x de €${(order.total_gross / order.installment_count).toFixed(2)}`, margin + 5, y, { fontSize: 10, color: [146, 64, 14] });
      
      if (order.installment_notes) {
        y += 6;
        addText(`Notas: ${order.installment_notes}`, margin + 5, y, { fontSize: 9, color: [146, 64, 14] });
      }
      
      y += 20;
    }

    // Client Notes
    if (order.client_notes) {
      addText("NOTAS DO CLIENTE", margin, y, { fontSize: 10, fontStyle: "bold" });
      y += 6;
      
      // Split long notes into multiple lines
      const splitNotes = doc.splitTextToSize(order.client_notes, pageWidth - margin * 2);
      doc.setFontSize(9);
      doc.setTextColor(...mutedColor);
      doc.text(splitNotes, margin, y);
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    addText(
      `Documento gerado automaticamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      pageWidth / 2,
      footerY,
      { fontSize: 8, color: mutedColor, align: "center" }
    );

    // Save the PDF
    doc.save(`${order.order_number}.pdf`);
  }, [workspaceName, workspaceLogo]);

  return { generatePDF };
}
