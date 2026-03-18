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

interface Props {
  metrics: WeeklyMetric[];
  pipelineValue: number;
  weekLabel: string;
  todaysBrief: DailyBrief | null;
  strategy: WeeklyStrategy | null;
}

const WIN_RATE = 0.3;

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

export function WarRoomBriefingExport({ metrics, pipelineValue, weekLabel, todaysBrief, strategy }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = () => {
    setIsExporting(true);
    try {
      const { today, target, closed, likelyPipeline, gap, probability } = buildBriefingData({ metrics, pipelineValue, weekLabel, todaysBrief, strategy });
      const doc = new jsPDF();
      let y = 20;
      const lm = 15;
      const pw = 180;

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("WAR ROOM — Briefing Diário", lm, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Semana ${weekLabel} • ${today}`, lm, y);
      y += 12;

      // Divider
      doc.setDrawColor(200, 200, 200);
      doc.line(lm, y, lm + pw, y);
      y += 8;

      // Section 1: Situação Semanal
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("📊 Situação Semanal", lm, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const situationLines = [
        `Meta Semanal: ${formatCurrency(target)}`,
        `Receita Fechada: ${formatCurrency(closed)} (${target > 0 ? Math.round((closed / target) * 100) : 0}% da meta)`,
        `Pipeline Provável: ${formatCurrency(likelyPipeline)} (${formatCurrency(pipelineValue)} × ${Math.round(WIN_RATE * 100)}%)`,
        `Gap Restante: ${formatCurrency(gap)}`,
        `Probabilidade de Atingir Meta: ${probability}%`,
      ];
      situationLines.forEach((line) => {
        doc.text(`  • ${line}`, lm, y);
        y += 6;
      });
      y += 4;

      // Section 2: KPIs da Semana
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("📈 KPIs da Semana", lm, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      metrics.forEach((m) => {
        const pctLabel = m.target > 0 ? ` (${m.pct}%)` : "";
        const value = m.format === "currency" ? formatCurrency(m.actual) : String(m.actual);
        const targetStr = m.target > 0 ? (m.format === "currency" ? formatCurrency(m.target) : String(m.target)) : "sem meta";
        const statusEmoji = m.status === "green" ? "✅" : m.status === "yellow" ? "⚠️" : "🔴";
        doc.text(`  ${statusEmoji} ${m.label}: ${value} / ${targetStr}${pctLabel}`, lm, y);
        y += 6;
      });
      y += 4;

      // Section 3: O que falta esta semana
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("🎯 O Que Falta Esta Semana", lm, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const pendingMetrics = metrics.filter((m) => m.target > 0 && m.actual < m.target);
      if (pendingMetrics.length === 0) {
        doc.text("  ✅ Todas as metas atingidas!", lm, y);
        y += 6;
      } else {
        pendingMetrics.forEach((m) => {
          const remaining = m.target - m.actual;
          const value = m.format === "currency" ? formatCurrency(remaining) : String(remaining);
          doc.text(`  → Faltam ${value} ${m.label.toLowerCase()}`, lm, y);
          y += 6;
        });
      }
      y += 4;

      // Section 4: Daily Brief (if available)
      if (todaysBrief) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("🧠 Daily Brief AI", lm, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        if (todaysBrief.summary) {
          const summaryLines = doc.splitTextToSize(todaysBrief.summary, pw);
          doc.text(summaryLines, lm + 4, y);
          y += summaryLines.length * 5 + 4;
        }

        if (todaysBrief.hot_leads) {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", "bold");
          doc.text("  🔥 Hot Leads:", lm, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          const hotLines = doc.splitTextToSize(todaysBrief.hot_leads, pw - 8);
          doc.text(hotLines, lm + 8, y);
          y += hotLines.length * 5 + 4;
        }

        if (todaysBrief.stuck_deals) {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", "bold");
          doc.text("  ⚠️ Deals Estagnados:", lm, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          const stuckLines = doc.splitTextToSize(todaysBrief.stuck_deals, pw - 8);
          doc.text(stuckLines, lm + 8, y);
          y += stuckLines.length * 5 + 4;
        }

        if (todaysBrief.action_suggestions && todaysBrief.action_suggestions.length > 0) {
          if (y > 250) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", "bold");
          doc.text("  ✅ Ações Prioritárias:", lm, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          todaysBrief.action_suggestions.forEach((action, i) => {
            if (y > 275) { doc.addPage(); y = 20; }
            const actionLines = doc.splitTextToSize(`${i + 1}. ${action}`, pw - 8);
            doc.text(actionLines, lm + 8, y);
            y += actionLines.length * 5 + 2;
          });
        }
        y += 4;
      }

      // Section 5: Weekly Strategy (if available)
      if (strategy) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("🚀 Estratégia Semanal AI", lm, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        if (strategy.summary) {
          const stratLines = doc.splitTextToSize(strategy.summary, pw);
          doc.text(stratLines, lm + 4, y);
          y += stratLines.length * 5 + 4;
        }

        if (strategy.quick_wins && strategy.quick_wins.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text("  Quick Wins:", lm, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          strategy.quick_wins.forEach((qw) => {
            if (y > 275) { doc.addPage(); y = 20; }
            const qwLines = doc.splitTextToSize(`• ${qw}`, pw - 8);
            doc.text(qwLines, lm + 8, y);
            y += qwLines.length * 5 + 2;
          });
        }

        if (strategy.risk_alerts && strategy.risk_alerts.length > 0) {
          y += 2;
          doc.setFont("helvetica", "bold");
          doc.text("  ⚠️ Alertas de Risco:", lm, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          strategy.risk_alerts.forEach((ra) => {
            if (y > 275) { doc.addPage(); y = 20; }
            const raLines = doc.splitTextToSize(`• ${ra}`, pw - 8);
            doc.text(raLines, lm + 8, y);
            y += raLines.length * 5 + 2;
          });
        }
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`FastCRM War Room Briefing • Página ${i}/${pageCount}`, lm, 290);
        doc.setTextColor(0, 0, 0);
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
      const { target, closed, gap, probability } = buildBriefingData({ metrics, pipelineValue, weekLabel, todaysBrief, strategy });
      const rows: string[][] = [
        ["Métrica", "Atual", "Meta", "Progresso (%)", "Estado"],
      ];

      metrics.forEach((m) => {
        const value = m.format === "currency" ? String(m.actual) : String(m.actual);
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
        rows.push(["Ações Prioritárias"]);
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
