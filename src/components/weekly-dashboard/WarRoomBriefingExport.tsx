import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Table } from "lucide-react";
import { WeeklyMetric } from "@/hooks/useWeeklyPerformance";
import { DailyBrief } from "@/hooks/useDailyBrief";
import { WeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  metrics: WeeklyMetric[];
  pipelineValue: number;
  weekLabel: string;
  todaysBrief: DailyBrief | null;
  strategy: WeeklyStrategy | null;
  workspaceName?: string;
  workspaceLogoUrl?: string | null;
}

const WIN_RATE = 0.3;

// Colors
const PRIMARY_RGB: [number, number, number] = [99, 60, 255]; // purple-ish brand
const HEADER_BG: [number, number, number] = [245, 243, 255];
const SECTION_BG: [number, number, number] = [248, 248, 252];
const GREEN: [number, number, number] = [34, 170, 68];
const YELLOW: [number, number, number] = [210, 160, 20];
const RED: [number, number, number] = [220, 50, 50];
const GRAY: [number, number, number] = [140, 140, 140];
const DARK: [number, number, number] = [30, 30, 40];

function statusColor(status: string): [number, number, number] {
  if (status === "green") return GREEN;
  if (status === "yellow") return YELLOW;
  return RED;
}

function statusLabel(status: string): string {
  if (status === "green") return "OK";
  if (status === "yellow") return "Atencao";
  return "Critico";
}

function buildBriefingData(props: Props) {
  const { metrics, pipelineValue, todaysBrief, strategy } = props;
  const today = new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const revenueMetric = metrics.find((m) => m.key === "revenue");
  const target = revenueMetric?.target ?? 0;
  const closed = revenueMetric?.actual ?? 0;
  const likelyPipeline = pipelineValue * WIN_RATE;
  const gap = Math.max(target - closed - likelyPipeline, 0);
  const probability = target > 0 ? Math.min(((closed + likelyPipeline) / target) * 100, 100) : 0;

  return { today, target, closed, likelyPipeline, gap, probability: Math.round(probability) };
}

async function loadLogoBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawSectionHeader(doc: jsPDF, title: string, y: number, lm: number, pw: number): number {
  doc.setFillColor(...SECTION_BG);
  doc.roundedRect(lm, y - 5, pw, 10, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(title, lm + 4, y + 1);
  return y + 12;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number = 30): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

export function WarRoomBriefingExport({ metrics, pipelineValue, weekLabel, todaysBrief, strategy, workspaceName, workspaceLogoUrl }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const { today, target, closed, likelyPipeline, gap, probability } = buildBriefingData({ metrics, pipelineValue, weekLabel, todaysBrief, strategy, workspaceName, workspaceLogoUrl });
      const doc = new jsPDF();
      let y = 15;
      const lm = 15;
      const pw = 180;

      // Load logo if available
      let logoData: string | null = null;
      if (workspaceLogoUrl) {
        logoData = await loadLogoBase64(workspaceLogoUrl);
      }

      // ── HEADER BAR ──
      doc.setFillColor(...PRIMARY_RGB);
      doc.rect(0, 0, 210, 35, "F");

      // Logo
      let headerTextX = lm;
      if (logoData) {
        try {
          doc.addImage(logoData, "PNG", lm, 5, 25, 25);
          headerTextX = lm + 30;
        } catch {
          // logo failed, continue without
        }
      }

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("WAR ROOM BRIEFING", headerTextX, 16);

      // Workspace name + date
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 255);
      const subtitle = workspaceName
        ? `${workspaceName}  |  Semana ${weekLabel}  |  ${today}`
        : `Semana ${weekLabel}  |  ${today}`;
      doc.text(subtitle, headerTextX, 24);

      // Probability badge
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(lm + pw - 35, 8, 35, 18, 3, 3, "F");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const probColor = probability >= 80 ? GREEN : probability >= 50 ? YELLOW : RED;
      doc.setTextColor(...probColor);
      doc.text(`${probability}%`, lm + pw - 30, 20);
      doc.setFontSize(6);
      doc.setTextColor(...GRAY);
      doc.text("Prob. Meta", lm + pw - 32, 24);

      y = 42;
      doc.setTextColor(...DARK);

      // ── SECTION 1: SITUACAO SEMANAL ──
      y = drawSectionHeader(doc, "SITUACAO SEMANAL", y, lm, pw);

      const situationData = [
        ["Meta Semanal", formatCurrency(target)],
        ["Receita Fechada", `${formatCurrency(closed)} (${target > 0 ? Math.round((closed / target) * 100) : 0}%)`],
        ["Pipeline Provavel", `${formatCurrency(likelyPipeline)} (${formatCurrency(pipelineValue)} x ${Math.round(WIN_RATE * 100)}%)`],
        ["Gap Restante", formatCurrency(gap)],
      ];

      doc.setFontSize(9);
      situationData.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        doc.text(label + ":", lm + 4, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...DARK);
        doc.text(value, lm + 55, y);
        y += 6;
      });
      y += 4;

      // ── SECTION 2: KPIs DA SEMANA (table) ──
      y = checkPageBreak(doc, y, 40);
      y = drawSectionHeader(doc, "KPIs DA SEMANA", y, lm, pw);

      const kpiTableBody = metrics.map((m) => {
        const value = m.format === "currency" ? formatCurrency(m.actual) : String(m.actual);
        const targetStr = m.target > 0 ? (m.format === "currency" ? formatCurrency(m.target) : String(m.target)) : "-";
        const pctLabel = m.target > 0 ? `${m.pct}%` : "-";
        return [m.label, value, targetStr, pctLabel, statusLabel(m.status)];
      });

      autoTable(doc, {
        startY: y,
        head: [["Metrica", "Atual", "Meta", "%", "Estado"]],
        body: kpiTableBody,
        margin: { left: lm + 2, right: lm + 2 },
        theme: "grid",
        headStyles: {
          fillColor: PRIMARY_RGB,
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: DARK,
        },
        columnStyles: {
          0: { cellWidth: 45 },
          4: { cellWidth: 22 },
        },
        didParseCell: (data: any) => {
          if (data.section === "body" && data.column.index === 4) {
            const status = data.cell.raw as string;
            if (status === "OK") data.cell.styles.textColor = GREEN;
            else if (status === "Atencao") data.cell.styles.textColor = YELLOW;
            else if (status === "Critico") data.cell.styles.textColor = RED;
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      y = (doc as any).lastAutoTable?.finalY ?? y + 30;
      y += 8;

      // ── SECTION 3: O QUE FALTA ──
      y = checkPageBreak(doc, y, 30);
      y = drawSectionHeader(doc, "O QUE FALTA ESTA SEMANA", y, lm, pw);

      doc.setFontSize(9);
      const pendingMetrics = metrics.filter((m) => m.target > 0 && m.actual < m.target);
      if (pendingMetrics.length === 0) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...GREEN);
        doc.text("[OK] Todas as metas atingidas!", lm + 4, y);
        doc.setTextColor(...DARK);
        y += 8;
      } else {
        pendingMetrics.forEach((m) => {
          y = checkPageBreak(doc, y);
          const remaining = m.target - m.actual;
          const value = m.format === "currency" ? formatCurrency(remaining) : String(remaining);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          doc.text(`>> Faltam ${value} ${m.label.toLowerCase()}`, lm + 4, y);
          y += 6;
        });
        y += 4;
      }

      // ── SECTION 4: DAILY BRIEF ──
      if (todaysBrief) {
        y = checkPageBreak(doc, y, 40);
        y = drawSectionHeader(doc, "DAILY BRIEF AI", y, lm, pw);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);

        if (todaysBrief.summary) {
          const summaryLines = doc.splitTextToSize(todaysBrief.summary, pw - 8);
          summaryLines.forEach((line: string) => {
            y = checkPageBreak(doc, y);
            doc.text(line, lm + 4, y);
            y += 5;
          });
          y += 4;
        }

        if (todaysBrief.hot_leads) {
          y = checkPageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...RED);
          doc.text("[HOT] Hot Leads:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          const hotLines = doc.splitTextToSize(todaysBrief.hot_leads, pw - 12);
          hotLines.forEach((line: string) => {
            y = checkPageBreak(doc, y);
            doc.text(line, lm + 8, y);
            y += 5;
          });
          y += 4;
        }

        if (todaysBrief.stuck_deals) {
          y = checkPageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...YELLOW);
          doc.text("[!] Deals Estagnados:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          const stuckLines = doc.splitTextToSize(todaysBrief.stuck_deals, pw - 12);
          stuckLines.forEach((line: string) => {
            y = checkPageBreak(doc, y);
            doc.text(line, lm + 8, y);
            y += 5;
          });
          y += 4;
        }

        if (todaysBrief.action_suggestions && todaysBrief.action_suggestions.length > 0) {
          y = checkPageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...GREEN);
          doc.text("Acoes Prioritarias:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          todaysBrief.action_suggestions.forEach((action, i) => {
            y = checkPageBreak(doc, y);
            const actionLines = doc.splitTextToSize(`${i + 1}. ${action}`, pw - 12);
            actionLines.forEach((line: string) => {
              y = checkPageBreak(doc, y);
              doc.text(line, lm + 8, y);
              y += 5;
            });
            y += 2;
          });
          y += 4;
        }
      }

      // ── SECTION 5: ESTRATEGIA SEMANAL ──
      if (strategy) {
        y = checkPageBreak(doc, y, 40);
        y = drawSectionHeader(doc, "ESTRATEGIA SEMANAL AI", y, lm, pw);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...DARK);

        if (strategy.summary) {
          const stratLines = doc.splitTextToSize(strategy.summary, pw - 8);
          stratLines.forEach((line: string) => {
            y = checkPageBreak(doc, y);
            doc.text(line, lm + 4, y);
            y += 5;
          });
          y += 4;
        }

        if (strategy.quick_wins && strategy.quick_wins.length > 0) {
          y = checkPageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.text("Quick Wins:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          strategy.quick_wins.forEach((qw) => {
            y = checkPageBreak(doc, y);
            const qwLines = doc.splitTextToSize(`- ${qw}`, pw - 12);
            qwLines.forEach((line: string) => {
              y = checkPageBreak(doc, y);
              doc.text(line, lm + 8, y);
              y += 5;
            });
            y += 2;
          });
          y += 2;
        }

        if (strategy.risk_alerts && strategy.risk_alerts.length > 0) {
          y = checkPageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...RED);
          doc.text("[!] Alertas de Risco:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          strategy.risk_alerts.forEach((ra) => {
            y = checkPageBreak(doc, y);
            const raLines = doc.splitTextToSize(`- ${ra}`, pw - 12);
            raLines.forEach((line: string) => {
              y = checkPageBreak(doc, y);
              doc.text(line, lm + 8, y);
              y += 5;
            });
            y += 2;
          });
        }
      }

      // ── FOOTER on all pages ──
      const pageCount = doc.getNumberOfPages();
      const footerName = workspaceName ? `${workspaceName} | ` : "";
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        doc.setDrawColor(220, 220, 220);
        doc.line(lm, 284, lm + pw, 284);
        doc.text(`${footerName}War Room Briefing  |  Pagina ${i}/${pageCount}`, lm, 289);
      }

      doc.save(`war-room-briefing-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Briefing PDF exportado com sucesso!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = () => {
    try {
      const { target, closed, gap, probability } = buildBriefingData({ metrics, pipelineValue, weekLabel, todaysBrief, strategy, workspaceName, workspaceLogoUrl });
      const rows: string[][] = [
        ["Metrica", "Atual", "Meta", "Progresso (%)", "Estado"],
      ];

      metrics.forEach((m) => {
        const value = String(m.actual);
        const tgt = m.target > 0 ? String(m.target) : "N/A";
        rows.push([m.label, value, tgt, `${m.pct}%`, m.status]);
      });

      rows.push([]);
      rows.push(["Resumo Semanal"]);
      rows.push(["Meta Semanal", String(target)]);
      rows.push(["Receita Fechada", String(closed)]);
      rows.push(["Gap Restante", String(gap)]);
      rows.push(["Probabilidade (%)", `${probability}%`]);

      if (todaysBrief?.summary) {
        rows.push([]);
        rows.push(["Daily Brief"]);
        rows.push([todaysBrief.summary]);
      }

      if (todaysBrief?.action_suggestions) {
        rows.push([]);
        rows.push(["Acoes Prioritarias"]);
        todaysBrief.action_suggestions.forEach((a, i) => rows.push([`${i + 1}. ${a}`]));
      }

      const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `war-room-briefing-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Briefing CSV exportado com sucesso!");
    } catch (err) {
      console.error("CSV export error:", err);
      toast.error("Erro ao exportar CSV");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={isExporting}>
          <Download className={`h-3.5 w-3.5 ${isExporting ? "animate-spin" : ""}`} />
          Briefing
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV} className="gap-2">
          <Table className="h-4 w-4" />
          Exportar CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
