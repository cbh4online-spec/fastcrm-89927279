import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { WeeklyBrief } from "@/hooks/useStrategicBriefs";
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
  brief: WeeklyBrief | null;
  workspaceName?: string;
  pipelineReport?: PipelineRiskReport | null;
  pipelineBuckets?: PipelineRiskBucket[];
  growthData?: GrowthData;
}

const PRIMARY: [number, number, number] = [99, 60, 255];
const SECTION_BG: [number, number, number] = [248, 248, 252];
const GREEN: [number, number, number] = [34, 170, 68];
const AMBER: [number, number, number] = [210, 160, 20];
const RED: [number, number, number] = [220, 50, 50];
const BLUE: [number, number, number] = [59, 130, 246];
const GRAY: [number, number, number] = [140, 140, 140];
const DARK: [number, number, number] = [30, 30, 40];

const BUCKET_COLORS: Record<string, [number, number, number]> = { hot: RED, likely: GREEN, uncertain: AMBER, low: GRAY };
const BUCKET_LABELS: Record<string, string> = { hot: "Hot", likely: "Likely", uncertain: "Uncertain", low: "Low" };
const CHURN_LABELS: Record<string, string> = { low: "Baixo", medium: "Medio", high: "Alto", critical: "Critico" };

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

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `EUR${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `EUR${(v / 1_000).toFixed(1)}K`;
  return `EUR${v.toFixed(0)}`;
}

export function ExecutiveBriefExport({ brief, workspaceName, pipelineReport, pipelineBuckets, growthData }: Props) {
  const [exporting, setExporting] = useState(false);

  const hasData = !!brief || !!pipelineReport || !!growthData;

  const exportPDF = async () => {
    if (!hasData) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      const lm = 15;
      const pw = 180;
      const today = new Date().toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const briefDate = brief ? new Date(brief.created_at).toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" }) : today;

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
      // SECTION 1: KPIs
      // ══════════════════════════════════════════
      if (brief) {
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
        // SECTION 2: EXECUTIVE SUMMARY
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
        // SECTION 3: STRATEGIC ANALYSIS
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
        // SECTION 4: PRIORITY ACTIONS
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
      }

      // ══════════════════════════════════════════
      // SECTION 5: PIPELINE HEALTH
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

          if (pipelineReport.ai_assessment) {
            const ai = pipelineReport.ai_assessment;
            y = pb(doc, y, 20);
            doc.setFont("helvetica", "bold");
            const riskColors: Record<string, [number, number, number]> = { low: GREEN, medium: AMBER, high: RED, critical: RED };
            doc.setTextColor(...(riskColors[ai.risk_level] || GRAY));
            doc.text(`Nivel de Risco: ${ai.risk_level.toUpperCase()}`, lm + 4, y);
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK);
            y = wrappedText(doc, ai.summary, lm + 4, y, pw - 8);
            y += 4;

            if (ai.critical_actions.length > 0) {
              y = pb(doc, y, 15);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(...RED);
              doc.text("Acoes Criticas:", lm + 4, y);
              y += 6;
              doc.setFont("helvetica", "normal");
              doc.setTextColor(...DARK);
              ai.critical_actions.forEach(a => {
                y = pb(doc, y);
                const urgLabel = a.urgency === "immediate" ? "[IMEDIATO]" : a.urgency === "this_week" ? "[ESTA SEMANA]" : "[MONITORAR]";
                y = wrappedText(doc, `${urgLabel} ${a.deal_title}: ${a.action}`, lm + 8, y, pw - 12);
                y += 1;
              });
              y += 4;
            }

            if (ai.recommendations.length > 0) {
              y = pb(doc, y, 15);
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

          if (pipelineReport.stalled_deals.length > 0) {
            y = pb(doc, y, 25);
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

          if (pipelineReport.low_prob_deals.length > 0) {
            y = pb(doc, y, 25);
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
      // SECTION 6: GROWTH INSIGHTS
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
          y = pb(doc, y, 30);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Top Clientes", lm + 4, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [["Nome", "Empresa", "Receita", "LTV", "Churn Risk"]],
            body: growthData.topCustomers.slice(0, 5).map(c => [
              c.name, c.company || "-", fmtCurrency(c.totalRevenue), fmtCurrency(c.ltv), CHURN_LABELS[c.churnRisk] || c.churnRisk,
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
          y = pb(doc, y, 30);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Top Vendedores", lm + 4, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [["Nome", "Receita", "Conversao", "Vel. Fecho", "Meta"]],
            body: growthData.topSellers.slice(0, 5).map(s => [
              s.name, fmtCurrency(s.totalRevenue), `${Math.round(s.conversionRate * 100)}%`, `${s.closeVelocity}d`, `${Math.round(s.targetProgress * 100)}%`,
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
          y = pb(doc, y, 30);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...DARK);
          doc.text("Need Matches (Oportunidades Sugeridas)", lm + 4, y);
          y += 4;

          autoTable(doc, {
            startY: y,
            head: [["Cliente", "Produto Recomendado", "Confianca", "Janela Ideal"]],
            body: growthData.needMatches.slice(0, 5).map(m => [
              m.customerName, m.recommendedProduct, `${Math.round(m.confidence * 100)}%`,
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
          y = pb(doc, y, 20);
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
              y = pb(doc, y);
              y = wrappedText(doc, `- ${ins}`, lm + 8, y, pw - 12);
              y += 1;
            });
            y += 4;
          }

          if (ai.recommendations?.length) {
            y = pb(doc, y, 15);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...DARK);
            doc.text("Recomendacoes:", lm + 4, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            ai.recommendations.forEach(rec => {
              y = pb(doc, y);
              y = wrappedText(doc, `- ${rec}`, lm + 8, y, pw - 12);
              y += 1;
            });
            y += 4;
          }

          if (ai.nextBestActions?.length) {
            y = pb(doc, y, 15);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...GREEN);
            doc.text("Proximas Acoes:", lm + 4, y);
            y += 5;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK);
            ai.nextBestActions.forEach((a, i) => {
              y = pb(doc, y);
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
      disabled={exporting || !hasData}
      className="gap-1.5"
    >
      <Download className={`h-3.5 w-3.5 ${exporting ? "animate-spin" : ""}`} />
      Exportar PDF
    </Button>
  );
}
