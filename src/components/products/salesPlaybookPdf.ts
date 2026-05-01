import jsPDF from "jspdf";

export interface ObjectionItem {
  objection: string;
  response: string;
}

export interface SalesPlaybookExport {
  productName: string;
  productSku?: string | null;
  productCategory?: string | null;
  script: string;
  objections: ObjectionItem[];
  warranty: string;
  updatedAt?: string | null;
}

/**
 * Generates a clean, printable A4 PDF of a product's Sales & Post-Sales playbook.
 * Designed to be shared with the team. Uses Helvetica (built-in) so it works
 * fully client-side without external font loading.
 */
export function generateSalesPlaybookPdf(data: SalesPlaybookExport): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  let cursorY = margin;

  const ensureSpace = (needed: number) => {
    if (cursorY + needed > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    }
  };

  const drawText = (
    text: string,
    opts: {
      size?: number;
      style?: "normal" | "bold" | "italic";
      color?: [number, number, number];
      lineGap?: number;
      indent?: number;
    } = {},
  ) => {
    const { size = 11, style = "normal", color = [33, 33, 33], lineGap = 4, indent = 0 } = opts;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, contentWidth - indent);
    const lineHeight = size * 1.25;
    for (const line of lines as string[]) {
      ensureSpace(lineHeight);
      doc.text(line, margin + indent, cursorY);
      cursorY += lineHeight;
    }
    cursorY += lineGap;
  };

  const drawSectionTitle = (title: string, accent: [number, number, number]) => {
    ensureSpace(40);
    cursorY += 8;
    // Accent bar
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(margin, cursorY - 12, 4, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    doc.text(title, margin + 12, cursorY);
    cursorY += 10;
    // Underline
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 14;
  };

  const drawDivider = () => {
    ensureSpace(16);
    cursorY += 4;
    doc.setDrawColor(238, 238, 238);
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 12;
  };

  // ── Header ──────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("Procedimento de Vendas & Pós-venda", margin, cursorY);
  cursorY += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  const nameLines = doc.splitTextToSize(data.productName || "Produto sem nome", contentWidth);
  for (const line of nameLines as string[]) {
    doc.text(line, margin, cursorY);
    cursorY += 16;
  }

  // Meta line
  const metaParts: string[] = [];
  if (data.productSku) metaParts.push(`SKU: ${data.productSku}`);
  if (data.productCategory) metaParts.push(`Categoria: ${data.productCategory}`);
  metaParts.push(
    `Gerado em ${new Date().toLocaleString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  );
  if (data.updatedAt) {
    try {
      metaParts.push(
        `Última atualização: ${new Date(data.updatedAt).toLocaleString("pt-PT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
      );
    } catch {
      /* ignore */
    }
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(metaParts.join("  •  "), margin, cursorY);
  cursorY += 18;

  drawDivider();

  // ── Script de vendas ───────────────────────────────────────────
  drawSectionTitle("Script de vendas", [37, 99, 235]); // blue
  if (data.script.trim()) {
    drawText(data.script.trim(), { size: 10.5, lineGap: 6 });
  } else {
    drawText("(Sem script definido.)", { size: 10, style: "italic", color: [140, 140, 140] });
  }

  // ── Objeções → Respostas ───────────────────────────────────────
  drawSectionTitle("Objeções e respostas", [217, 119, 6]); // amber
  if (data.objections.length === 0) {
    drawText("(Sem objeções registadas.)", { size: 10, style: "italic", color: [140, 140, 140] });
  } else {
    data.objections.forEach((item, idx) => {
      ensureSpace(60);
      drawText(`${idx + 1}. Objeção`, { size: 10, style: "bold", color: [120, 53, 15], lineGap: 2 });
      drawText(item.objection?.trim() || "(vazio)", {
        size: 11,
        style: "normal",
        color: [40, 40, 40],
        lineGap: 6,
      });
      drawText("Resposta sugerida", { size: 10, style: "bold", color: [22, 101, 52], lineGap: 2 });
      drawText(item.response?.trim() || "(vazio)", {
        size: 11,
        style: "normal",
        color: [40, 40, 40],
        lineGap: 10,
      });
      if (idx < data.objections.length - 1) drawDivider();
    });
  }

  // ── Reclamação & garantia ──────────────────────────────────────
  drawSectionTitle("Reclamação e garantia", [5, 150, 105]); // emerald
  if (data.warranty.trim()) {
    drawText(data.warranty.trim(), { size: 10.5, lineGap: 6 });
  } else {
    drawText("(Sem procedimento definido.)", {
      size: 10,
      style: "italic",
      color: [140, 140, 140],
    });
  }

  // ── Footer com paginação ───────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - margin / 2,
      { align: "right" },
    );
    doc.text(
      "Documento interno — Procedimento de vendas e pós-venda",
      margin,
      pageHeight - margin / 2,
    );
  }

  return doc;
}

/** Build a safe filename from the product name. */
export function buildPlaybookFilename(productName: string): string {
  const slug = (productName || "produto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "produto";
  const today = new Date().toISOString().slice(0, 10);
  return `playbook-${slug}-${today}.pdf`;
}
