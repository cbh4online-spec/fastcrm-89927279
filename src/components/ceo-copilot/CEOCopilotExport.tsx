import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { DailyBrief } from "@/hooks/useDailyBrief";
import { WeeklyStrategy } from "@/hooks/useWeeklyStrategy";
import { PipelineRiskReport } from "@/hooks/usePipelineRiskReport";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TopCustomer, TopSeller, NeedMatch, GrowthInsightsSummary, AIGrowthAnalysis } from "@/types/growth-insights";

interface PipelineRiskBucket {
  category: string;
  count: number;
  total_value: number;
  avg_score: number;
}

interface GrowthData {
  topCustomers: TopCustomer[];
  topSellers: TopSeller[];
  needMatches: NeedMatch[];
  summary: GrowthInsightsSummary;
  aiAnalysis: AIGrowthAnalysis | null;
}

interface Props {
  dailyBrief: DailyBrief | null;
  strategy: WeeklyStrategy | null;
  pipelineReport: PipelineRiskReport | null;
  workspaceName?: string;
  pipelineBuckets?: PipelineRiskBucket[];
  growthData?: GrowthData;
}

// Colors
const PRIMARY: [number, number, number] = [99, 60, 255];
const HEADER_BG: [number, number, number] = [245, 243, 255];
const SECTION_BG: [number, number, number] = [248, 248, 252];
const GREEN: [number, number, number] = [34, 170, 68];
const AMBER: [number, number, number] = [210, 160, 20];
const RED: [number, number, number] = [220, 50, 50];
const GRAY: [number, number, number] = [140, 140, 140];
const DARK: [number, number, number] = [30, 30, 40];
const BLUE: [number, number, number] = [60, 120, 220];

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

function pageBreak(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > 275) { doc.addPage(); return 20; }
  return y;
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

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `EUR${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `EUR${(v / 1_000).toFixed(1)}K`;
  return `EUR${v.toFixed(0)}`;
}

const BUCKET_COLORS: Record<string, [number, number, number]> = {
  hot: RED,
  likely: GREEN,
  uncertain: AMBER,
  low: GRAY,
};

const BUCKET_LABELS: Record<string, string> = {
  hot: "Hot",
  likely: "Likely",
  uncertain: "Uncertain",
  low: "Low",
};

const CHURN_LABELS: Record<string, string> = {
  low: "Baixo",
  medium: "Medio",
  high: "Alto",
  critical: "Critico",
};

export function CEOCopilotExport({ dailyBrief, strategy, pipelineReport, workspaceName, pipelineBuckets, growthData }: Props) {
  const [exporting, setExporting] = useState(false);

  const hasData = !!dailyBrief || !!strategy || !!pipelineReport || !!growthData;

  const exportPDF = async () => {
    if (!hasData) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      const lm = 15;
      const pw = 180;
      const today = new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      // ── HEADER ──
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, 210, 32, "F");
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("AI CEO COPILOT REPORT", lm, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 255);
      const sub = workspaceName ? `${workspaceName}  |  ${today}` : today;
      doc.text(sub, lm, 24);

      let y = 40;
      doc.setTextColor(...DARK);

      // ══════════════════════════════════════════
      // SECTION 1: DAILY BRIEF
      // ══════════════════════════════════════════
      if (dailyBrief) {
        y = sectionHeader(doc, "DAILY BRIEF", y, lm, pw);

        const m = dailyBrief.key_metrics;
        if (m) {
          const kpis = [
            ["Leads Hoje", String(m.leads_today ?? 0)],
            ["Receita Hoje", fmtCurrency(m.revenue_today ?? 0)],
            ["Deals Estagnados", String(m.deals_stalled ?? 0)],
            ["Tarefas Pendentes", String(m.tasks_pending ?? 0)],
          ];
          autoTable(doc, {
            startY: y,
            head: [kpis.map(k => k[0])],
            body: [kpis.map(k => k[1])],
            margin: { left: lm + 2, right: lm + 2 },
            theme: "grid",
            headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
            bodyStyles: { fontSize: 10, textColor: DARK, fontStyle: "bold", halign: "center" },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
          y += 6;
        }

        if (dailyBrief.summary) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Resumo Executivo", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          y = wrappedText(doc, dailyBrief.summary, lm + 4, y, pw - 8);
          y += 4;
        }

        if (dailyBrief.hot_leads) {
          y = pageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...RED);
          doc.text("[HOT] Hot Leads:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          y = wrappedText(doc, dailyBrief.hot_leads, lm + 8, y, pw - 12);
          y += 4;
        }

        if (dailyBrief.stuck_deals) {
          y = pageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...AMBER);
          doc.text("[!] Deals Estagnados:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          y = wrappedText(doc, dailyBrief.stuck_deals, lm + 8, y, pw - 12);
          y += 4;
        }

        if (dailyBrief.revenue_highlight) {
          y = pageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...GREEN);
          doc.text("Destaque de Receita:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          y = wrappedText(doc, dailyBrief.revenue_highlight, lm + 8, y, pw - 12);
          y += 4;
        }

        if (dailyBrief.action_suggestions?.length) {
          y = pageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...GREEN);
          doc.text("Acoes Prioritarias:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          dailyBrief.action_suggestions.forEach((a, i) => {
            y = pageBreak(doc, y);
            y = wrappedText(doc, `${i + 1}. ${a}`, lm + 8, y, pw - 12);
            y += 1;
          });
          y += 4;
        }
      }

      // ══════════════════════════════════════════
      // SECTION 2: WEEKLY STRATEGY
      // ══════════════════════════════════════════
      if (strategy) {
        y = sectionHeader(doc, "ESTRATEGIA SEMANAL", y, lm, pw);
        doc.setFontSize(9);

        if (strategy.summary) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...PRIMARY);
          doc.text("Resumo Semanal", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          y = wrappedText(doc, strategy.summary, lm + 4, y, pw - 8);
          y += 6;
        }

        if (strategy.gap_analysis.length > 0) {
          y = pageBreak(doc, y, 30);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Gap Analysis", lm + 4, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [["Metrica", "Atual", "Meta", "Gap", "Estado"]],
            body: strategy.gap_analysis.map(g => {
              const statusTxt = g.status === "on_track" ? "On Track" : g.status === "at_risk" ? "At Risk" : "Behind";
              return [g.metric, String(g.actual), String(g.target), `${g.gap_pct > 0 ? "+" : ""}${g.gap_pct}%`, statusTxt];
            }),
            margin: { left: lm + 2, right: lm + 2 },
            theme: "grid",
            headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
            bodyStyles: { fontSize: 8, textColor: DARK },
            didParseCell: (data: any) => {
              if (data.section === "body" && data.column.index === 4) {
                const s = data.cell.raw as string;
                if (s === "On Track") data.cell.styles.textColor = GREEN;
                else if (s === "At Risk") data.cell.styles.textColor = AMBER;
                else data.cell.styles.textColor = RED;
                data.cell.styles.fontStyle = "bold";
              }
            },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
          y += 6;
        }

        if (strategy.risk_alerts.length > 0) {
          y = pageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...RED);
          doc.text("[!] Alertas de Risco:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          strategy.risk_alerts.forEach(ra => {
            y = wrappedText(doc, `- ${ra}`, lm + 8, y, pw - 12);
            y += 1;
          });
          y += 4;
        }

        if (strategy.quick_wins.length > 0) {
          y = pageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...GREEN);
          doc.text("Quick Wins:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          strategy.quick_wins.forEach(qw => {
            y = wrappedText(doc, `- ${qw}`, lm + 8, y, pw - 12);
            y += 1;
          });
          y += 4;
        }

        if (strategy.recommendations.length > 0) {
          y = pageBreak(doc, y, 15);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Recomendacoes:", lm + 4, y);
          y += 6;
          doc.setFont("helvetica", "normal");
          strategy.recommendations.forEach(rec => {
            y = pageBreak(doc, y);
            const priorityTag = `[${rec.priority.toUpperCase()}]`;
            doc.setFont("helvetica", "bold");
            if (rec.priority === "high") doc.setTextColor(...RED);
            else if (rec.priority === "medium") doc.setTextColor(...AMBER);
            else doc.setTextColor(...GRAY);
            doc.text(priorityTag, lm + 8, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK);
            y = wrappedText(doc, `${rec.action} -- ${rec.impact}`, lm + 28, y, pw - 32);
            y += 2;
          });
          y += 4;
        }
      }

      // ══════════════════════════════════════════
      // SECTION 3: PIPELINE HEALTH
      // ══════════════════════════════════════════
      if (pipelineReport || (pipelineBuckets && pipelineBuckets.length > 0)) {
        y = sectionHeader(doc, "PIPELINE HEALTH", y, lm, pw);
        doc.setFontSize(9);

        // Risk Buckets table
        if (pipelineBuckets && pipelineBuckets.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Risk Buckets", lm + 4, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [["Categoria", "Deals", "Valor Total", "Score Medio"]],
            body: pipelineBuckets.map(b => [
              BUCKET_LABELS[b.category] || b.category,
              String(b.count),
              fmtCurrency(b.total_value),
              `${b.avg_score}%`,
            ]),
            margin: { left: lm + 2, right: lm + 2 },
            theme: "grid",
            headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
            bodyStyles: { fontSize: 8, textColor: DARK },
            didParseCell: (data: any) => {
              if (data.section === "body" && data.column.index === 0) {
                const cat = pipelineBuckets[data.row.index]?.category;
                if (cat && BUCKET_COLORS[cat]) {
                  data.cell.styles.textColor = BUCKET_COLORS[cat];
                  data.cell.styles.fontStyle = "bold";
                }
              }
            },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
          y += 6;
        }

        if (pipelineReport) {
          // Summary stats
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...GRAY);
          doc.text("Pipeline Total:", lm + 4, y);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text(fmtCurrency(pipelineReport.total_pipeline), lm + 45, y);
          y += 6;

          doc.setFont("helvetica", "normal");
          doc.setTextColor(...GRAY);
          doc.text("Valor em Risco:", lm + 4, y);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...RED);
          doc.text(fmtCurrency(pipelineReport.at_risk_value), lm + 45, y);
          y += 8;
          doc.setTextColor(...DARK);

          // AI Assessment
          if (pipelineReport.ai_assessment) {
            const ai = pipelineReport.ai_assessment;
            y = pageBreak(doc, y, 20);
            doc.setFont("helvetica", "bold");
            const riskColors: Record<string, [number, number, number]> = {
              low: GREEN, medium: AMBER, high: RED, critical: RED,
            };
            doc.setTextColor(...(riskColors[ai.risk_level] || GRAY));
            doc.text(`Nivel de Risco: ${ai.risk_level.toUpperCase()}`, lm + 4, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK);
            y = wrappedText(doc, ai.summary, lm + 4, y, pw - 8);
            y += 4;

            if (ai.critical_actions.length > 0) {
              y = pageBreak(doc, y, 15);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(...RED);
              doc.text("Acoes Criticas:", lm + 4, y);
              y += 6;
              doc.setFont("helvetica", "normal");
              doc.setTextColor(...DARK);
              ai.critical_actions.forEach(a => {
                y = pageBreak(doc, y);
                const urgLabel = a.urgency === "immediate" ? "[IMEDIATO]" : a.urgency === "this_week" ? "[ESTA SEMANA]" : "[MONITORAR]";
                y = wrappedText(doc, `${urgLabel} ${a.deal_title}: ${a.action}`, lm + 8, y, pw - 12);
                y += 1;
              });
              y += 4;
            }

            if (ai.recommendations.length > 0) {
              y = pageBreak(doc, y, 15);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(...DARK);
              doc.text("Recomendacoes AI:", lm + 4, y);
              y += 6;
              doc.setFont("helvetica", "normal");
              ai.recommendations.forEach(rec => {
                y = wrappedText(doc, `- ${rec}`, lm + 8, y, pw - 12);
                y += 1;
              });
              y += 4;
            }
          }

          // Stalled deals table
          if (pipelineReport.stalled_deals.length > 0) {
            y = pageBreak(doc, y, 25);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...DARK);
            doc.text(`Deals Estagnados (${pipelineReport.stalled_deals.length})`, lm + 4, y);
            y += 4;

            autoTable(doc, {
              startY: y,
              head: [["Deal", "Dias Parado", "Valor"]],
              body: pipelineReport.stalled_deals.slice(0, 10).map(d => [
                d.title, String(d.days_stalled ?? d.days_inactive ?? "?"), fmtCurrency(d.value || 0),
              ]),
              margin: { left: lm + 2, right: lm + 2 },
              theme: "grid",
              headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
              bodyStyles: { fontSize: 8, textColor: DARK },
            });
            y = (doc as any).lastAutoTable?.finalY ?? y + 20;
            y += 6;
          }

          // Low probability deals
          if (pipelineReport.low_prob_deals.length > 0) {
            y = pageBreak(doc, y, 25);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...DARK);
            doc.text(`Baixa Probabilidade (${pipelineReport.low_prob_deals.length})`, lm + 4, y);
            y += 4;

            autoTable(doc, {
              startY: y,
              head: [["Deal", "Probabilidade", "Valor"]],
              body: pipelineReport.low_prob_deals.slice(0, 10).map(d => [
                d.title, `${d.probability ?? 0}%`, fmtCurrency(d.value || 0),
              ]),
              margin: { left: lm + 2, right: lm + 2 },
              theme: "grid",
              headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
              bodyStyles: { fontSize: 8, textColor: DARK },
            });
            y = (doc as any).lastAutoTable?.finalY ?? y + 20;
            y += 6;
          }
        }
      }

      // ══════════════════════════════════════════
      // SECTION 4: GROWTH INSIGHTS
      // ══════════════════════════════════════════
      if (growthData) {
        y = sectionHeader(doc, "GROWTH INSIGHTS", y, lm, pw);
        doc.setFontSize(9);

        // Summary KPIs
        const gs = growthData.summary;
        const summaryKpis = [
          ["Top Clientes", String(gs.topCustomersCount)],
          ["Receita Total", fmtCurrency(gs.topCustomersTotalRevenue)],
          ["Need Matches", String(gs.pendingNeedMatches)],
          ["Eventos Lifecycle", String(gs.upcomingLifecycleEvents)],
        ];

        autoTable(doc, {
          startY: y,
          head: [summaryKpis.map(k => k[0])],
          body: [summaryKpis.map(k => k[1])],
          margin: { left: lm + 2, right: lm + 2 },
          theme: "grid",
          headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
          bodyStyles: { fontSize: 10, textColor: DARK, fontStyle: "bold", halign: "center" },
        });
        y = (doc as any).lastAutoTable?.finalY ?? y + 20;
        y += 8;

        // Top Customers
        if (growthData.topCustomers.length > 0) {
          y = pageBreak(doc, y, 30);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Top Clientes", lm + 4, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [["Nome", "Empresa", "Receita", "LTV", "Churn Risk"]],
            body: growthData.topCustomers.slice(0, 5).map(c => [
              c.name,
              c.company || "-",
              fmtCurrency(c.totalRevenue),
              fmtCurrency(c.ltv),
              CHURN_LABELS[c.churnRisk] || c.churnRisk,
            ]),
            margin: { left: lm + 2, right: lm + 2 },
            theme: "grid",
            headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
            bodyStyles: { fontSize: 8, textColor: DARK },
            didParseCell: (data: any) => {
              if (data.section === "body" && data.column.index === 4) {
                const risk = growthData.topCustomers[data.row.index]?.churnRisk;
                if (risk === "critical" || risk === "high") data.cell.styles.textColor = RED;
                else if (risk === "medium") data.cell.styles.textColor = AMBER;
                else data.cell.styles.textColor = GREEN;
                data.cell.styles.fontStyle = "bold";
              }
            },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
          y += 8;
        }

        // Top Sellers
        if (growthData.topSellers.length > 0) {
          y = pageBreak(doc, y, 30);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Top Vendedores", lm + 4, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [["Nome", "Receita", "Conversao", "Vel. Fecho", "Meta"]],
            body: growthData.topSellers.slice(0, 5).map(s => [
              s.name,
              fmtCurrency(s.totalRevenue),
              `${Math.round(s.conversionRate * 100)}%`,
              `${s.closeVelocity}d`,
              `${Math.round(s.targetProgress * 100)}%`,
            ]),
            margin: { left: lm + 2, right: lm + 2 },
            theme: "grid",
            headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
            bodyStyles: { fontSize: 8, textColor: DARK },
            didParseCell: (data: any) => {
              if (data.section === "body" && data.column.index === 4) {
                const progress = growthData.topSellers[data.row.index]?.targetProgress ?? 0;
                if (progress >= 0.8) data.cell.styles.textColor = GREEN;
                else if (progress >= 0.5) data.cell.styles.textColor = AMBER;
                else data.cell.styles.textColor = RED;
                data.cell.styles.fontStyle = "bold";
              }
            },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
          y += 8;
        }

        // Need Matches
        if (growthData.needMatches.length > 0) {
          y = pageBreak(doc, y, 30);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Need Matches (Oportunidades Sugeridas)", lm + 4, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [["Cliente", "Produto Recomendado", "Confianca", "Janela Ideal"]],
            body: growthData.needMatches.slice(0, 5).map(m => [
              m.customerName,
              m.recommendedProduct,
              `${Math.round(m.confidence * 100)}%`,
              `${new Date(m.idealWindow.start).toLocaleDateString("pt-PT")} - ${new Date(m.idealWindow.end).toLocaleDateString("pt-PT")}`,
            ]),
            margin: { left: lm + 2, right: lm + 2 },
            theme: "grid",
            headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
            bodyStyles: { fontSize: 8, textColor: DARK },
            didParseCell: (data: any) => {
              if (data.section === "body" && data.column.index === 2) {
                const conf = growthData.needMatches[data.row.index]?.confidence ?? 0;
                if (conf >= 0.8) data.cell.styles.textColor = GREEN;
                else if (conf >= 0.5) data.cell.styles.textColor = AMBER;
                else data.cell.styles.textColor = RED;
                data.cell.styles.fontStyle = "bold";
              }
            },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
          y += 8;
        }

        // AI Growth Analysis
        if (growthData.aiAnalysis) {
          const ai = growthData.aiAnalysis;
          y = pageBreak(doc, y, 20);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...BLUE);
          doc.text("Analise AI de Crescimento", lm + 4, y);
          y += 6;

          if (ai.insights?.length) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...DARK);
            doc.text("Insights:", lm + 4, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            ai.insights.forEach(ins => {
              y = pageBreak(doc, y);
              y = wrappedText(doc, `- ${ins}`, lm + 8, y, pw - 12);
              y += 1;
            });
            y += 4;
          }

          if (ai.recommendations?.length) {
            y = pageBreak(doc, y, 15);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...DARK);
            doc.text("Recomendacoes:", lm + 4, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            ai.recommendations.forEach(rec => {
              y = pageBreak(doc, y);
              y = wrappedText(doc, `- ${rec}`, lm + 8, y, pw - 12);
              y += 1;
            });
            y += 4;
          }

          if (ai.nextBestActions?.length) {
            y = pageBreak(doc, y, 15);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...GREEN);
            doc.text("Proximas Acoes:", lm + 4, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK);
            ai.nextBestActions.forEach((a, i) => {
              y = pageBreak(doc, y);
              y = wrappedText(doc, `${i + 1}. ${a}`, lm + 8, y, pw - 12);
              y += 1;
            });
            y += 4;
          }
        }
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
        doc.text(`${footerPrefix}AI CEO Copilot Report  |  Pagina ${i}/${pages}`, lm, 289);
      }

      doc.save(`ceo-copilot-report-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Relatorio CEO Copilot exportado!");
    } catch (err) {
      console.error("CEO Copilot PDF export error:", err);
      toast.error("Erro ao exportar relatorio");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportPDF}
      disabled={exporting || !hasData}
      className="gap-1.5"
    >
      <Download className={`h-3.5 w-3.5 ${exporting ? "animate-spin" : ""}`} />
      Exportar PDF
    </Button>
  );
}
