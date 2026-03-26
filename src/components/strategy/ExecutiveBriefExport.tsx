import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { WeeklyBrief } from "@/hooks/useStrategicBriefs";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  brief: WeeklyBrief | null;
  workspaceName?: string;
}

const PRIMARY: [number, number, number] = [99, 60, 255];
const SECTION_BG: [number, number, number] = [248, 248, 252];
const GREEN: [number, number, number] = [34, 170, 68];
const AMBER: [number, number, number] = [210, 160, 20];
const RED: [number, number, number] = [220, 50, 50];
const BLUE: [number, number, number] = [59, 130, 246];
const GRAY: [number, number, number] = [140, 140, 140];
const DARK: [number, number, number] = [30, 30, 40];

function pb(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > 275) { doc.addPage(); return 20; }
  return y;
}

function sectionHeader(doc: jsPDF, title: string, y: number, lm: number, pw: number): number {
  y = pb(doc, y, 20);
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
    y = pb(doc, y);
    doc.text(line, x, y);
    y += 5;
  });
  return y;
}

export function ExecutiveBriefExport({ brief, workspaceName }: Props) {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    if (!brief) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      const lm = 15;
      const pw = 180;
      const today = new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const briefDate = new Date(brief.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });

      // ── HEADER ──
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, 210, 32, "F");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("BRIEF EXECUTIVO SEMANAL", lm, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 255);
      const sub = workspaceName ? `${workspaceName}  |  ${briefDate}` : briefDate;
      doc.text(sub, lm, 24);

      let y = 40;
      doc.setTextColor(...DARK);

      // ══════════════════════════════════════════
      // KPIs
      // ══════════════════════════════════════════
      const km = brief.key_metrics;
      if (km) {
        y = sectionHeader(doc, "METRICAS CHAVE", y, lm, pw);

        const kpiData = [
          ["Leads", km.leads_total != null ? String(km.leads_total) : "-", km.leads_change != null ? `${km.leads_change > 0 ? "+" : ""}${km.leads_change}%` : "-"],
          ["Receita", "-", km.revenue_change != null ? `${km.revenue_change > 0 ? "+" : ""}${km.revenue_change}%` : "-"],
          ["Conversao", "-", km.conversion_change != null ? `${km.conversion_change > 0 ? "+" : ""}${km.conversion_change}%` : "-"],
          ["Tempo Resposta", "-", km.response_time_change != null ? `${km.response_time_change > 0 ? "+" : ""}${km.response_time_change}%` : "-"],
          ["Deals Ganhos", km.won_deals != null ? String(km.won_deals) : "-", "-"],
          ["Deals Perdidos", km.lost_deals != null ? String(km.lost_deals) : "-", "-"],
          ["Tarefas Completas", km.tasks_completed != null ? String(km.tasks_completed) : "-", "-"],
          ["Tarefas Pendentes", km.tasks_pending != null ? String(km.tasks_pending) : "-", "-"],
        ].filter(row => row[1] !== "-" || row[2] !== "-");

        autoTable(doc, {
          startY: y,
          head: [["Metrica", "Valor", "Variacao vs Semana Anterior"]],
          body: kpiData,
          margin: { left: lm + 2, right: lm + 2 },
          theme: "grid",
          headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
          bodyStyles: { fontSize: 9, textColor: DARK },
          didParseCell: (data: any) => {
            if (data.section === "body" && data.column.index === 2) {
              const val = data.cell.raw as string;
              if (val.startsWith("+")) data.cell.styles.textColor = GREEN;
              else if (val.startsWith("-")) data.cell.styles.textColor = RED;
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
        y = (doc as any).lastAutoTable?.finalY ?? y + 30;
        y += 8;
      }

      // ══════════════════════════════════════════
      // EXECUTIVE SUMMARY
      // ══════════════════════════════════════════
      if (brief.summary) {
        y = sectionHeader(doc, "RESUMO EXECUTIVO", y, lm, pw);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);
        y = wrappedText(doc, brief.summary, lm + 4, y, pw - 8);
        y += 6;
      }

      // ══════════════════════════════════════════
      // OPPORTUNITY / RISK / MARKET SIGNAL
      // ══════════════════════════════════════════
      if (brief.opportunity || brief.risk || brief.market_signal) {
        y = sectionHeader(doc, "ANALISE ESTRATEGICA", y, lm, pw);
        doc.setFontSize(9);

        if (brief.opportunity) {
          y = pb(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...GREEN);
          doc.text("[OPORTUNIDADE]", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          y = wrappedText(doc, brief.opportunity, lm + 8, y, pw - 12);
          y += 4;
        }

        if (brief.risk) {
          y = pb(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...RED);
          doc.text("[RISCO]", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          y = wrappedText(doc, brief.risk, lm + 8, y, pw - 12);
          y += 4;
        }

        if (brief.market_signal) {
          y = pb(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...BLUE);
          doc.text("[SINAL DE MERCADO]", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          y = wrappedText(doc, brief.market_signal, lm + 8, y, pw - 12);
          y += 4;
        }
        y += 4;
      }

      // ══════════════════════════════════════════
      // PRIORITY ACTIONS
      // ══════════════════════════════════════════
      if (brief.priority_actions?.length) {
        y = sectionHeader(doc, "ACOES PRIORITARIAS", y, lm, pw);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);
        brief.priority_actions.forEach((action, i) => {
          y = pb(doc, y);
          y = wrappedText(doc, `${i + 1}. ${action}`, lm + 4, y, pw - 8);
          y += 2;
        });
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
        doc.text(`${footerPrefix}Brief Executivo Semanal  |  Pagina ${i}/${pages}`, lm, 289);
      }

      doc.save(`brief-executivo-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Brief executivo exportado com sucesso!");
    } catch (err) {
      console.error("Executive Brief PDF export error:", err);
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
      disabled={exporting || !brief}
      className="gap-1.5"
    >
      <Download className={`h-3.5 w-3.5 ${exporting ? "animate-spin" : ""}`} />
      Exportar PDF
    </Button>
  );
}
