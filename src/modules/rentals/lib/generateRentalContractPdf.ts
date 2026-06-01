import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { NewRentalLineInput } from "../types";

export interface RentalPdfInput {
  contract_number?: string;
  workspace_name?: string;
  end_client_name?: string;
  end_client_tax_id?: string | null;
  financier_name?: string;
  financier_tax_id?: string | null;
  start_date: string;
  duration_months: number;
  monthly_amount: number;
  total_financed: number;
  notes?: string;
  items: NewRentalLineInput[];
  origin_proposal_title?: string;
}

function fmtMoney(n: number) {
  return `${(Number(n) || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-PT");
  } catch {
    return iso;
  }
}

export function generateRentalContractPdf(input: RentalPdfInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 50;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Pré-visualização — Contrato de Renting", marginX, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Documento não vinculativo · Gerado em ${new Date().toLocaleString("pt-PT")}`,
    marginX,
    y + 10,
  );
  if (input.contract_number) {
    doc.text(`Nº ${input.contract_number}`, pageWidth - marginX, y + 10, { align: "right" });
  }
  doc.setTextColor(0);
  y += 30;

  // Parties
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. Partes", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const colW = (pageWidth - marginX * 2) / 2;
  const clientLines = [
    `Cliente final: ${input.end_client_name ?? "—"}`,
    `NIF: ${input.end_client_tax_id ?? "—"}`,
  ];
  const finLines = [
    `Financiadora: ${input.financier_name ?? "—"}`,
    `NIF: ${input.financier_tax_id ?? "—"}`,
  ];
  clientLines.forEach((t, i) => doc.text(t, marginX, y + i * 14));
  finLines.forEach((t, i) => doc.text(t, marginX + colW, y + i * 14));
  y += clientLines.length * 14 + 10;

  // Term
  doc.setFont("helvetica", "bold");
  doc.text("2. Prazo e renda", marginX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.text(`Data início: ${fmtDate(input.start_date)}`, marginX, y);
  doc.text(`Prazo: ${input.duration_months} meses`, marginX + colW * 0.5, y);
  doc.text(`Renda mensal: ${fmtMoney(input.monthly_amount)}`, marginX + colW, y);
  y += 20;

  // Line items
  doc.setFont("helvetica", "bold");
  doc.text("3. Equipamento e valores", marginX, y);
  y += 6;

  const hasCost = input.items.some((l) => l.cost_price != null);

  const head = hasCost
    ? [["#", "Descrição", "Qtd", "Preço unit.", "Total", "Custo unit.", "Custo total", "Margem"]]
    : [["#", "Descrição", "Qtd", "Preço unit.", "Total"]];

  const body = input.items.map((l, i) => {
    const total = Number(l.quantity || 0) * Number(l.unit_price || 0);
    if (!hasCost) {
      return [
        String(i + 1),
        l.description || "—",
        String(l.quantity),
        fmtMoney(l.unit_price),
        fmtMoney(total),
      ];
    }
    const costUnit = l.cost_price ?? 0;
    const costTotal = costUnit * Number(l.quantity || 0);
    const margin = total > 0 ? ((total - costTotal) / total) * 100 : 0;
    return [
      String(i + 1),
      l.description || "—",
      String(l.quantity),
      fmtMoney(l.unit_price),
      fmtMoney(total),
      l.cost_price != null ? fmtMoney(costUnit) : "—",
      l.cost_price != null ? fmtMoney(costTotal) : "—",
      l.cost_price != null ? `${margin.toFixed(1)} %` : "—",
    ];
  });

  autoTable(doc, {
    startY: y + 6,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, halign: "left" },
    columnStyles: hasCost
      ? {
          0: { halign: "center", cellWidth: 22 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "right" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
        }
      : {
          0: { halign: "center", cellWidth: 22 },
          2: { halign: "center", cellWidth: 40 },
          3: { halign: "right" },
          4: { halign: "right" },
        },
    margin: { left: marginX, right: marginX },
  });

  // After table
  // @ts-expect-error lastAutoTable injected by plugin
  y = (doc.lastAutoTable?.finalY ?? y) + 16;

  // Totals
  const totalFinanced = input.items.reduce(
    (s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0),
    0,
  );
  const totalCost = hasCost
    ? input.items.reduce(
        (s, l) => s + Number(l.cost_price ?? 0) * Number(l.quantity || 0),
        0,
      )
    : null;
  const globalMargin =
    totalCost != null && totalFinanced > 0
      ? ((totalFinanced - totalCost) / totalFinanced) * 100
      : null;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total financiado: ${fmtMoney(totalFinanced)}`, pageWidth - marginX, y, { align: "right" });
  y += 14;
  if (totalCost != null) {
    doc.setFont("helvetica", "normal");
    doc.text(`Custo total: ${fmtMoney(totalCost)}`, pageWidth - marginX, y, { align: "right" });
    y += 14;
    if (globalMargin != null) {
      doc.setFont("helvetica", "bold");
      doc.text(`Margem global: ${globalMargin.toFixed(1)} %`, pageWidth - marginX, y, { align: "right" });
      y += 14;
    }
  }
  doc.setFont("helvetica", "bold");
  doc.text(`Renda mensal: ${fmtMoney(input.monthly_amount)}`, pageWidth - marginX, y, { align: "right" });
  y += 20;

  // Notes / origin
  if (input.origin_proposal_title || input.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("4. Notas", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (input.origin_proposal_title) {
      doc.text(`Origem: proposta "${input.origin_proposal_title}"`, marginX, y);
      y += 14;
    }
    if (input.notes) {
      const lines = doc.splitTextToSize(input.notes, pageWidth - marginX * 2);
      doc.text(lines, marginX, y);
      y += lines.length * 12;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Pré-visualização — não substitui contrato assinado · Página ${p}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  return doc;
}
