import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TopCustomer, TopSeller, NeedMatch, GrowthInsightsSummary, AIGrowthAnalysis } from "@/types/growth-insights";

interface Snapshot {
  target_revenue: number;
  closed_revenue: number;
  most_likely_revenue: number;
  best_case_revenue: number;
  worst_case_revenue: number;
  weighted_pipeline: number;
  forecast_gap: number;
  target_hit_probability: number;
  forecast_confidence: number;
  created_at: string;
}

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
  snapshot: Snapshot | null;
  target: { target_revenue: number; target_deals: number } | null;
  topDeals: any[];
  riskSignals: any[];
  recommendations: any[];
  workspaceName?: string;
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

export function RFCExport({ snapshot, target, topDeals, riskSignals, recommendations, workspaceName, pipelineBuckets, growthData }: Props) {
  const [exporting, setExporting] = useState(false);

  const hasData = !!snapshot || topDeals.length > 0;

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
      doc.text("REVENUE FLIGHT CONTROL", lm, 15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 255);
      const sub = workspaceName ? `${workspaceName}  |  ${today}` : today;
      doc.text(sub, lm, 24);

      let y = 40;
      doc.setTextColor(...DARK);

      // ══════════════════════════════════════════
      // SECTION 1: FORECAST SNAPSHOT
      // ══════════════════════════════════════════
      if (snapshot) {
        y = sectionHeader(doc, "FORECAST SNAPSHOT", y, lm, pw);

        const hitProb = Math.round(snapshot.target_hit_probability * 100);
        const confidence = Math.round(snapshot.forecast_confidence);

        const kpis = [
          ["Target", fmtCurrency(snapshot.target_revenue)],
          ["Fechado", fmtCurrency(snapshot.closed_revenue)],
          ["Most Likely", fmtCurrency(snapshot.most_likely_revenue)],
          ["Gap", `${snapshot.forecast_gap > 0 ? "-" : "+"}${fmtCurrency(Math.abs(snapshot.forecast_gap))}`],
          ["Hit Prob.", `${hitProb}%`],
        ];

        autoTable(doc, {
          startY: y,
          head: [kpis.map(k => k[0])],
          body: [kpis.map(k => k[1])],
          margin: { left: lm + 2, right: lm + 2 },
          theme: "grid",
          headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
          bodyStyles: { fontSize: 10, textColor: DARK, fontStyle: "bold", halign: "center" },
          didParseCell: (data: any) => {
            if (data.section === "body") {
              if (data.column.index === 1) data.cell.styles.textColor = GREEN; // Fechado
              if (data.column.index === 3) data.cell.styles.textColor = snapshot.forecast_gap > 0 ? RED : GREEN; // Gap
              if (data.column.index === 4) data.cell.styles.textColor = hitProb >= 70 ? GREEN : hitProb >= 40 ? AMBER : RED; // Hit Prob
            }
          },
        });
        y = (doc as any).lastAutoTable?.finalY ?? y + 20;
        y += 6;

        // Scenario band
        const scenarios = [
          ["Best Case", fmtCurrency(snapshot.best_case_revenue)],
          ["Most Likely", fmtCurrency(snapshot.most_likely_revenue)],
          ["Worst Case", fmtCurrency(snapshot.worst_case_revenue)],
          ["Pipeline Ponderado", fmtCurrency(snapshot.weighted_pipeline)],
          ["Confianca", `${confidence}%`],
        ];

        autoTable(doc, {
          startY: y,
          head: [scenarios.map(s => s[0])],
          body: [scenarios.map(s => s[1])],
          margin: { left: lm + 2, right: lm + 2 },
          theme: "grid",
          headStyles: { fillColor: [80, 80, 100], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold", halign: "center" },
          bodyStyles: { fontSize: 9, textColor: DARK, halign: "center" },
          didParseCell: (data: any) => {
            if (data.section === "body") {
              if (data.column.index === 0) data.cell.styles.textColor = GREEN;
              if (data.column.index === 2) data.cell.styles.textColor = RED;
              if (data.column.index === 4) data.cell.styles.textColor = confidence >= 60 ? GREEN : confidence >= 30 ? AMBER : RED;
            }
          },
        });
        y = (doc as any).lastAutoTable?.finalY ?? y + 20;
        y += 8;
      }

      // ══════════════════════════════════════════
      // SECTION 2: TOP DEALS
      // ══════════════════════════════════════════
      if (topDeals.length > 0) {
        y = sectionHeader(doc, "TOP DEALS — MAIS PROVAVEIS", y, lm, pw);

        autoTable(doc, {
          startY: y,
          head: [["Deal", "Empresa", "Valor", "Prob.", "Risco"]],
          body: topDeals.slice(0, 10).map((d: any) => {
            const opp = d.opportunities;
            return [
              opp?.title || "—",
              opp?.companies?.name || "—",
              fmtCurrency(opp?.value || 0),
              `${d.probability_score}%`,
              `${d.risk_score}`,
            ];
          }),
          margin: { left: lm + 2, right: lm + 2 },
          theme: "grid",
          headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
          bodyStyles: { fontSize: 8, textColor: DARK },
          didParseCell: (data: any) => {
            if (data.section === "body") {
              if (data.column.index === 3) {
                const score = topDeals[data.row.index]?.probability_score ?? 0;
                data.cell.styles.textColor = score >= 70 ? GREEN : score >= 40 ? AMBER : RED;
                data.cell.styles.fontStyle = "bold";
              }
              if (data.column.index === 4) {
                const risk = topDeals[data.row.index]?.risk_score ?? 0;
                data.cell.styles.textColor = risk >= 60 ? RED : risk >= 30 ? AMBER : GREEN;
                data.cell.styles.fontStyle = "bold";
              }
            }
          },
        });
        y = (doc as any).lastAutoTable?.finalY ?? y + 20;
        y += 8;
      }

      // ══════════════════════════════════════════
      // SECTION 3: RISK SIGNALS
      // ══════════════════════════════════════════
      if (riskSignals.length > 0) {
        y = sectionHeader(doc, "RISCOS DO FORECAST", y, lm, pw);
        doc.setFontSize(9);

        const criticalRisks = riskSignals.filter((r: any) => r.severity === "critical" || r.severity === "high").slice(0, 10);

        if (criticalRisks.length > 0) {
          autoTable(doc, {
            startY: y,
            head: [["Severidade", "Tipo", "Razao", "Deal", "Valor"]],
            body: criticalRisks.map((r: any) => [
              r.severity?.toUpperCase() || "—",
              r.signal_type || "—",
              r.reason || "—",
              r.opportunities?.title || "—",
              fmtCurrency(r.opportunities?.value || 0),
            ]),
            margin: { left: lm + 2, right: lm + 2 },
            theme: "grid",
            headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
            bodyStyles: { fontSize: 7, textColor: DARK },
            columnStyles: { 2: { cellWidth: 60 } },
            didParseCell: (data: any) => {
              if (data.section === "body" && data.column.index === 0) {
                const sev = criticalRisks[data.row.index]?.severity;
                data.cell.styles.textColor = sev === "critical" ? RED : AMBER;
                data.cell.styles.fontStyle = "bold";
              }
            },
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
          y += 8;
        }
      }

      // ══════════════════════════════════════════
      // SECTION 4: RECOMMENDATIONS
      // ══════════════════════════════════════════
      if (recommendations.length > 0) {
        y = sectionHeader(doc, "ACOES PARA ACELERAR RECEITA", y, lm, pw);
        doc.setFontSize(9);

        recommendations.slice(0, 8).forEach((rec: any, i: number) => {
          y = pb(doc, y, 20);
          doc.setFont("helvetica", "bold");
          const priorityColor = rec.priority === "critical" ? RED : rec.priority === "high" ? AMBER : GRAY;
          doc.setTextColor(...priorityColor);
          doc.text(`[${(rec.priority || "medium").toUpperCase()}]`, lm + 4, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...DARK);
          const titleX = lm + 28;
          y = wrappedText(doc, rec.title || "—", titleX, y, pw - 32);
          if (rec.description) {
            doc.setTextColor(...GRAY);
            y = wrappedText(doc, rec.description, lm + 8, y, pw - 12);
            doc.setTextColor(...DARK);
          }
          if (rec.impact_estimate > 0) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...GREEN);
            doc.text(`Impacto: ${fmtCurrency(rec.impact_estimate)}`, lm + 8, y);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(...DARK);
            y += 5;
          }
          y += 3;
        });
        y += 4;
      }

      // ══════════════════════════════════════════
      // SECTION 5: PIPELINE HEALTH (BUCKETS)
      // ══════════════════════════════════════════
      if (pipelineBuckets && pipelineBuckets.length > 0) {
        y = sectionHeader(doc, "PIPELINE HEALTH", y, lm, pw);

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
        y += 8;
      }

      // ══════════════════════════════════════════
      // SECTION 6: GROWTH INSIGHTS
      // ══════════════════════════════════════════
      if (growthData) {
        y = sectionHeader(doc, "GROWTH INSIGHTS", y, lm, pw);
        doc.setFontSize(9);

        // Summary KPIs
        const gs = growthData.summary;
        autoTable(doc, {
          startY: y,
          head: [["Top Clientes", "Receita Total", "Need Matches", "Eventos Lifecycle"]],
          body: [[String(gs.topCustomersCount), fmtCurrency(gs.topCustomersTotalRevenue), String(gs.pendingNeedMatches), String(gs.upcomingLifecycleEvents)]],
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
          doc.text("Need Matches", lm + 4, y);
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
          });
          y = (doc as any).lastAutoTable?.finalY ?? y + 20;
          y += 8;
        }

        // AI Analysis
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
        doc.text(`${footerPrefix}Revenue Flight Control Report  |  Pagina ${i}/${pages}`, lm, 289);
      }

      doc.save(`revenue-flight-control-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Revenue Flight Control exportado!");
    } catch (err) {
      console.error("RFC PDF export error:", err);
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
