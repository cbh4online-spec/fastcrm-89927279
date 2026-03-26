import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BusinessContext } from "@/hooks/useBusinessContext";
import { BlockStatus } from "@/hooks/useContextScore";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  data: BusinessContext | null;
  blocks: BlockStatus[];
  globalScore: number;
  workspaceName?: string;
}

const PRIMARY: [number, number, number] = [99, 60, 255];
const SECTION_BG: [number, number, number] = [248, 248, 252];
const GREEN: [number, number, number] = [34, 170, 68];
const AMBER: [number, number, number] = [210, 160, 20];
const RED: [number, number, number] = [220, 50, 50];
const GRAY: [number, number, number] = [140, 140, 140];
const DARK: [number, number, number] = [30, 30, 40];

function pageBreak(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > 275) { doc.addPage(); return 20; }
  return y;
}

function sectionHeader(doc: jsPDF, title: string, y: number, lm: number, pw: number): number {
  y = pageBreak(doc, y, 20);
  doc.setFillColor(...SECTION_BG);
  doc.roundedRect(lm, y - 5, pw, 10, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(title, lm + 4, y + 1);
  return y + 12;
}

function wrappedText(doc: jsPDF, text: string, x: number, yStart: number, maxW: number): number {
  let y = yStart;
  const lines = doc.splitTextToSize(text, maxW);
  lines.forEach((line: string) => {
    y = pageBreak(doc, y);
    doc.text(line, x, y);
    y += 5;
  });
  return y;
}

function labelValue(doc: jsPDF, label: string, value: string, lm: number, y: number, pw: number): number {
  y = pageBreak(doc, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GRAY);
  doc.text(`${label}:`, lm + 4, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const valLines = doc.splitTextToSize(value, pw - 55);
  valLines.forEach((line: string, i: number) => {
    if (i > 0) y = pageBreak(doc, y);
    doc.text(line, lm + 50, y);
    y += 5;
  });
  return y + 1;
}

function listItems(doc: jsPDF, items: string[], lm: number, y: number, pw: number): number {
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  items.forEach(item => {
    y = pageBreak(doc, y);
    y = wrappedText(doc, `- ${item}`, lm + 8, y, pw - 12);
    y += 1;
  });
  return y + 2;
}

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `EUR${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `EUR${(v / 1_000).toFixed(0)}K`;
  return `EUR${v.toFixed(0)}`;
}

export function ContextOSExport({ data, blocks, globalScore, workspaceName }: Props) {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      const lm = 15;
      const pw = 180;
      const today = new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      // ── HEADER ──
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, 210, 36, "F");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("CONTEXT OS - MEMORIA ESTRATEGICA", lm, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 255);
      const sub = workspaceName ? `${workspaceName}  |  ${today}` : today;
      doc.text(sub, lm, 24);

      // Score badge
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(lm + pw - 35, 8, 35, 18, 3, 3, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const scoreColor = globalScore >= 80 ? GREEN : globalScore >= 50 ? AMBER : RED;
      doc.setTextColor(...scoreColor);
      doc.text(`${globalScore}%`, lm + pw - 30, 20);
      doc.setFontSize(6);
      doc.setTextColor(...GRAY);
      doc.text("Context Score", lm + pw - 34, 24);

      let y = 44;
      doc.setTextColor(...DARK);

      // ══════════════════════════════════════════
      // OVERVIEW TABLE - Block health
      // ══════════════════════════════════════════
      y = sectionHeader(doc, "VISAO GERAL", y, lm, pw);

      const overviewBody = blocks.map(b => {
        const stateLabel = b.state === "filled" ? "OK" : b.state === "aging" ? "A envelhecer" : b.state === "stale" ? "Desatualizado" : "Por preencher";
        return [b.title, `${b.fillPercent}%`, stateLabel, b.staleDays < 999 ? `${b.staleDays} dias` : "-"];
      });

      autoTable(doc, {
        startY: y,
        head: [["Bloco", "Preenchimento", "Estado", "Ultima atualizacao"]],
        body: overviewBody,
        margin: { left: lm + 2, right: lm + 2 },
        theme: "grid",
        headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: DARK },
        didParseCell: (cellData: any) => {
          if (cellData.section === "body" && cellData.column.index === 2) {
            const s = cellData.cell.raw as string;
            if (s === "OK") cellData.cell.styles.textColor = GREEN;
            else if (s === "A envelhecer") cellData.cell.styles.textColor = AMBER;
            else if (s === "Desatualizado") cellData.cell.styles.textColor = RED;
            else cellData.cell.styles.textColor = GRAY;
            cellData.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as any).lastAutoTable?.finalY ?? y + 30;
      y += 8;

      // ══════════════════════════════════════════
      // STRATEGY
      // ══════════════════════════════════════════
      if (data.business_model || data.business_description || data.active_strategies?.length) {
        y = sectionHeader(doc, "ESTRATEGIA", y, lm, pw);
        doc.setFontSize(9);
        if (data.business_description) {
          y = labelValue(doc, "Descricao", data.business_description, lm, y, pw);
        }
        if (data.business_model) {
          y = labelValue(doc, "Modelo", data.business_model, lm, y, pw);
        }
        if (data.active_strategies?.length) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          y = pageBreak(doc, y);
          doc.text("Estrategias Ativas:", lm + 4, y);
          y += 6;
          y = listItems(doc, data.active_strategies, lm, y, pw);
        }
        y += 4;
      }

      // ══════════════════════════════════════════
      // ICP
      // ══════════════════════════════════════════
      if (data.icp_description || data.icp_industries?.length || data.icp_pain_points?.length) {
        y = sectionHeader(doc, "CLIENTE IDEAL (ICP)", y, lm, pw);
        doc.setFontSize(9);
        if (data.icp_description) {
          y = labelValue(doc, "Descricao", data.icp_description, lm, y, pw);
        }
        if (data.icp_industries?.length) {
          y = labelValue(doc, "Industrias", data.icp_industries.join(", "), lm, y, pw);
        }
        if (data.icp_company_size) {
          y = labelValue(doc, "Tamanho", data.icp_company_size, lm, y, pw);
        }
        if (data.icp_decision_maker) {
          y = labelValue(doc, "Decisor", data.icp_decision_maker, lm, y, pw);
        }
        if (data.icp_pain_points?.length) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          y = pageBreak(doc, y);
          doc.text("Dores:", lm + 4, y);
          y += 6;
          y = listItems(doc, data.icp_pain_points, lm, y, pw);
        }
        y += 4;
      }

      // ══════════════════════════════════════════
      // OFFERS
      // ══════════════════════════════════════════
      if (data.offers?.length || data.pricing_model || data.average_ticket) {
        y = sectionHeader(doc, "OFERTAS & PRODUTOS", y, lm, pw);
        doc.setFontSize(9);
        if (data.pricing_model) {
          y = labelValue(doc, "Modelo Preco", data.pricing_model, lm, y, pw);
        }
        if (data.average_ticket) {
          y = labelValue(doc, "Ticket Medio", fmtCurrency(data.average_ticket), lm, y, pw);
        }
        if (data.offers?.length) {
          y = pageBreak(doc, y, 20);
          const offersBody = data.offers.map(o => [o.name, o.type || "-", o.price || "-", o.description || "-"]);
          autoTable(doc, {
            startY: y,
            head: [["Oferta", "Tipo", "Preco", "Descricao"]],
            body: offersBody,
            margin: { left: lm + 2, right: lm + 2 },
            theme: "grid",
            headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
            bodyStyles: { fontSize: 8, textColor: DARK },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
        }
        y += 6;
      }

      // ══════════════════════════════════════════
      // GOALS
      // ══════════════════════════════════════════
      if (data.monthly_revenue_target || data.quarterly_revenue_target || data.annual_revenue_target || data.deals_target_monthly) {
        y = sectionHeader(doc, "METAS & OKRS", y, lm, pw);
        doc.setFontSize(9);
        if (data.monthly_revenue_target) y = labelValue(doc, "Meta Mensal", fmtCurrency(data.monthly_revenue_target), lm, y, pw);
        if (data.quarterly_revenue_target) y = labelValue(doc, "Meta Trimestral", fmtCurrency(data.quarterly_revenue_target), lm, y, pw);
        if (data.annual_revenue_target) y = labelValue(doc, "Meta Anual", fmtCurrency(data.annual_revenue_target), lm, y, pw);
        if (data.deals_target_monthly) y = labelValue(doc, "Deals/Mes", String(data.deals_target_monthly), lm, y, pw);
        y += 4;
      }

      // ══════════════════════════════════════════
      // TEAM
      // ══════════════════════════════════════════
      if (data.team_size || data.team_roles?.length) {
        y = sectionHeader(doc, "EQUIPA", y, lm, pw);
        doc.setFontSize(9);
        if (data.team_size) y = labelValue(doc, "Tamanho", String(data.team_size), lm, y, pw);
        if (data.team_roles?.length) {
          y = labelValue(doc, "Funcoes", data.team_roles.join(", "), lm, y, pw);
        }
        y += 4;
      }

      // ══════════════════════════════════════════
      // PROCESS
      // ══════════════════════════════════════════
      if (data.sales_process_steps?.length || data.sales_cycle_days || data.follow_up_sla_hours) {
        y = sectionHeader(doc, "PROCESSOS DE VENDA", y, lm, pw);
        doc.setFontSize(9);
        if (data.sales_cycle_days) y = labelValue(doc, "Ciclo Venda", `${data.sales_cycle_days} dias`, lm, y, pw);
        if (data.follow_up_sla_hours) y = labelValue(doc, "SLA Follow-up", `${data.follow_up_sla_hours}h`, lm, y, pw);
        if (data.sales_process_steps?.length) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          y = pageBreak(doc, y);
          doc.text("Etapas do Processo:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          data.sales_process_steps.forEach((step, i) => {
            y = pageBreak(doc, y);
            y = wrappedText(doc, `${i + 1}. ${step}`, lm + 8, y, pw - 12);
            y += 1;
          });
        }
        y += 4;
      }

      // ══════════════════════════════════════════
      // SCRIPTS & OBJECTIONS
      // ══════════════════════════════════════════
      if (data.objections_common?.length || data.scripts?.length) {
        y = sectionHeader(doc, "SCRIPTS & OBJECOES", y, lm, pw);
        doc.setFontSize(9);
        if (data.objections_common?.length) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...RED);
          y = pageBreak(doc, y);
          doc.text("Objecoes Comuns:", lm + 4, y);
          y += 6;
          y = listItems(doc, data.objections_common, lm, y, pw);
        }
        if (data.scripts?.length) {
          data.scripts.forEach(s => {
            y = pageBreak(doc, y, 20);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...DARK);
            doc.text(`[${(s.stage || "geral").toUpperCase()}] ${s.name}`, lm + 4, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            y = wrappedText(doc, s.content, lm + 8, y, pw - 12);
            y += 4;
          });
        }
        y += 4;
      }

      // ── FOOTER ──
      const pages = doc.getNumberOfPages();
      const footerPrefix = workspaceName ? `${workspaceName} | ` : "";
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        doc.setDrawColor(220, 220, 220);
        doc.line(lm, 284, lm + pw, 284);
        doc.text(`${footerPrefix}Context OS - Memoria Estrategica  |  Pagina ${i}/${pages}`, lm, 289);
      }

      doc.save(`context-os-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Memoria estrategica exportada com sucesso!");
    } catch (err) {
      console.error("Context OS PDF export error:", err);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportPDF}
      disabled={exporting || !data}
      className="gap-1.5"
    >
      <Download className={`h-3.5 w-3.5 ${exporting ? "animate-spin" : ""}`} />
      Exportar PDF
    </Button>
  );
}
