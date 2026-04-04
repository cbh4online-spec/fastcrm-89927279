import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import type { PipelineRiskReport, MultiPipelineIntelReport, DealIntelligenceReport, DealRiskItem, PipelineComparison, BottleneckStage } from "@/types/ai-sales-coach";

interface ExportData {
  riskReport: PipelineRiskReport | null;
  multiReport: MultiPipelineIntelReport | null;
  dealReports: DealIntelligenceReport[];
  opportunities: Array<{ id: string; title: string; stage_name: string; value: number }>;
}

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  muted: [107, 114, 128] as [number, number, number],
  dark: [17, 24, 39] as [number, number, number],
  light: [243, 244, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function healthColor(score: number): [number, number, number] {
  if (score >= 70) return COLORS.success;
  if (score >= 40) return COLORS.warning;
  return COLORS.danger;
}

function severityColor(severity: string): [number, number, number] {
  if (severity === "critical") return COLORS.danger;
  if (severity === "high") return [234, 88, 12];
  if (severity === "medium") return COLORS.warning;
  return [59, 130, 246];
}

export function exportSalesCoachPdf(data: ExportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const now = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: pt });

  // ── Helper functions ──
  function addSectionTitle(title: string) {
    checkPageBreak(14);
    y += 4;
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 3, y + 5.5);
    doc.setTextColor(...COLORS.dark);
    y += 12;
  }

  function addSubTitle(title: string) {
    checkPageBreak(10);
    y += 2;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(title, margin, y);
    doc.setTextColor(...COLORS.dark);
    y += 5;
  }

  function addText(text: string, fontSize = 9) {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, contentW - 4);
    const lineH = fontSize * 0.45;
    checkPageBreak(lines.length * lineH + 2);
    doc.text(lines, margin + 2, y);
    y += lines.length * lineH + 2;
  }

  function addKpiRow(items: Array<{ label: string; value: string; color?: [number, number, number] }>) {
    checkPageBreak(16);
    const boxW = contentW / items.length;
    items.forEach((item, i) => {
      const x = margin + i * boxW;
      doc.setFillColor(...COLORS.light);
      doc.roundedRect(x + 1, y, boxW - 2, 14, 2, 2, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      doc.text(item.label, x + boxW / 2, y + 4, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(item.color ?? COLORS.dark));
      doc.text(item.value, x + boxW / 2, y + 11, { align: "center" });
    });
    doc.setTextColor(...COLORS.dark);
    y += 18;
  }

  function addBulletList(items: string[], emoji = "•") {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    items.forEach((item) => {
      const lines = doc.splitTextToSize(item, contentW - 12);
      checkPageBreak(lines.length * 4 + 2);
      doc.text(`${emoji}`, margin + 2, y);
      doc.text(lines, margin + 8, y);
      y += lines.length * 4 + 1.5;
    });
    y += 1;
  }

  function addNumberedList(items: string[]) {
    doc.setFontSize(9);
    items.forEach((item, i) => {
      const lines = doc.splitTextToSize(item, contentW - 14);
      checkPageBreak(lines.length * 4 + 2);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}.`, margin + 2, y);
      doc.setFont("helvetica", "normal");
      doc.text(lines, margin + 10, y);
      y += lines.length * 4 + 1.5;
    });
    y += 1;
  }

  function checkPageBreak(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = margin;
      addFooter();
    }
  }

  function addFooter() {
    const pageH = doc.internal.pageSize.getHeight();
    const pages = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(`FastCRM — AI Sales Coach Report`, margin, pageH - 6);
    doc.text(`Página ${pages}`, pageW - margin, pageH - 6, { align: "right" });
    doc.setTextColor(...COLORS.dark);
  }

  // ── Cover / Header ──
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AI Sales Coach", margin, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de Intelligence do Pipeline", margin, 26);
  doc.setFontSize(8);
  doc.text(now, margin, 34);
  doc.setTextColor(...COLORS.dark);
  y = 48;

  // ── 1. Pipeline Risk ──
  if (data.riskReport) {
    const r = data.riskReport;
    addSectionTitle("1. ANÁLISE DE RISCO DO PIPELINE");

    addKpiRow([
      { label: "Pipeline Health", value: `${r.pipeline_health_score}/100`, color: healthColor(r.pipeline_health_score) },
      { label: "Valor em Risco", value: `€${Number(r.at_risk_value).toLocaleString("pt-PT")}`, color: COLORS.warning },
      { label: "Negócios Críticos", value: String(r.critical_count), color: COLORS.danger },
      { label: "Idade Média", value: `${r.avg_deal_age_days ?? 0} dias`, color: COLORS.muted },
    ]);

    if (r.executive_summary) {
      addSubTitle("Sumário Executivo");
      addText(r.executive_summary);
    }

    if (r.top_3_priorities && r.top_3_priorities.length > 0) {
      addSubTitle("Top 3 Prioridades");
      addNumberedList(r.top_3_priorities);
    }

    if (r.risk_breakdown && Object.keys(r.risk_breakdown).length > 0) {
      addSubTitle("Distribuição de Riscos");
      const riskEntries = Object.entries(r.risk_breakdown).map(([k, v]) => `${k}: ${v}`);
      addBulletList(riskEntries);
    }

    // Deal Risks Table
    if (r.deal_risks && r.deal_risks.length > 0) {
      addSubTitle("Deals em Risco");
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Deal", "Stage", "Valor", "Severidade", "Acção Recomendada"]],
        body: r.deal_risks.map((d: DealRiskItem) => [
          d.opportunity_name,
          d.stage,
          `€${d.value?.toLocaleString("pt-PT")}`,
          d.severity.toUpperCase(),
          d.recommended_action,
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 35 },
          2: { halign: "right", cellWidth: 22 },
          3: { cellWidth: 20 },
        },
        didParseCell: (hookData: any) => {
          if (hookData.section === "body" && hookData.column.index === 3) {
            const sev = String(hookData.cell.raw).toLowerCase();
            hookData.cell.styles.textColor = severityColor(sev);
            hookData.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Conversion Rates
    if (r.conversion_rates && Object.keys(r.conversion_rates).length > 0) {
      addSubTitle("Taxas de Conversão por Stage");
      const convEntries = Object.entries(r.conversion_rates).map(([k, v]) => `${k}: ${Math.round(Number(v) * 100)}%`);
      addBulletList(convEntries);
    }
  }

  // ── 2. Deal Intelligence ──
  if (data.dealReports.length > 0) {
    addSectionTitle("2. DEAL INTELLIGENCE");

    const tableBody = data.dealReports.map((r) => {
      const opp = data.opportunities.find((o) => o.id === r.opportunity_id);
      return [
        opp?.title ?? r.opportunity_id.slice(0, 12),
        opp?.stage_name ?? "-",
        opp?.value ? `€${opp.value.toLocaleString("pt-PT")}` : "-",
        `${r.health_score}`,
        `${r.win_probability}%`,
        r.sentiment ?? "-",
        r.stall_risk ? "Sim" : "Não",
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Deal", "Stage", "Valor", "Health", "Win %", "Sentimento", "Estagnado"]],
      body: tableBody,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 38 },
        2: { halign: "right", cellWidth: 22 },
        3: { halign: "center", cellWidth: 14 },
        4: { halign: "center", cellWidth: 14 },
        6: { halign: "center", cellWidth: 18 },
      },
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && hookData.column.index === 3) {
          const score = parseInt(String(hookData.cell.raw), 10);
          hookData.cell.styles.textColor = healthColor(score);
          hookData.cell.styles.fontStyle = "bold";
        }
        if (hookData.section === "body" && hookData.column.index === 6) {
          if (String(hookData.cell.raw) === "Sim") {
            hookData.cell.styles.textColor = COLORS.danger;
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Top deal insights
    const topDeals = data.dealReports.slice(0, 5);
    topDeals.forEach((r) => {
      const opp = data.opportunities.find((o) => o.id === r.opportunity_id);
      const title = opp?.title ?? r.opportunity_id.slice(0, 12);

      addSubTitle(`📊 ${title}`);

      if (r.coaching_summary) addText(r.coaching_summary);

      if (r.risk_signals && r.risk_signals.length > 0) {
        const risks = r.risk_signals.map((s) => `[${s.severity.toUpperCase()}] ${s.type}: ${s.description}`);
        addBulletList(risks, "⚠");
      }

      if (r.next_actions && r.next_actions.length > 0) {
        const actions = r.next_actions.map((a) => `${a.action} (${a.due_days}d) — ${a.rationale}`);
        addNumberedList(actions);
      }
    });
  }

  // ── 3. Multi-Pipeline ──
  if (data.multiReport) {
    const m = data.multiReport;
    addSectionTitle("3. ANÁLISE MULTI-PIPELINE");

    if (m.pipeline_comparison && (m.pipeline_comparison as PipelineComparison[]).length > 0) {
      addSubTitle("Comparação de Pipelines");
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Pipeline", "Deals", "Valor Total", "Win Rate", "Ciclo (dias)", "Score"]],
        body: (m.pipeline_comparison as PipelineComparison[]).map((p) => [
          p.name,
          String(p.deal_count),
          `€${p.total_value?.toLocaleString("pt-PT")}`,
          `${Math.round(p.win_rate * 100)}%`,
          String(p.avg_cycle_days),
          String(p.health_score),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold" },
        columnStyles: {
          2: { halign: "right" },
          3: { halign: "center" },
          4: { halign: "center" },
          5: { halign: "center" },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (m.winning_patterns && m.winning_patterns.length > 0) {
      addSubTitle("Padrões de Sucesso");
      addBulletList(m.winning_patterns, "✓");
    }

    if (m.losing_patterns && m.losing_patterns.length > 0) {
      addSubTitle("Padrões de Perda");
      addBulletList(m.losing_patterns, "✗");
    }

    if (m.bottleneck_stages && (m.bottleneck_stages as BottleneckStage[]).length > 0) {
      addSubTitle("Fases com Maior Estagnação");
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Stage", "Dias Médios", "Drop Rate", "Nº Deals"]],
        body: (m.bottleneck_stages as BottleneckStage[]).map((b) => [
          b.stage_name,
          String(b.avg_days_stuck),
          `${Math.round(b.drop_rate * 100)}%`,
          String(b.deal_count),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: "bold" },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (m.strategic_insights && m.strategic_insights.length > 0) {
      addSubTitle("Insights Estratégicos");
      addNumberedList(m.strategic_insights);
    }

    if (m.growth_opportunities && m.growth_opportunities.length > 0) {
      addSubTitle("Oportunidades de Crescimento");
      addBulletList(m.growth_opportunities, "🌱");
    }
  }

  // ── Footer on all pages ──
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text("FastCRM — AI Sales Coach Report", margin, pageH - 6);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
    doc.text(now, pageW / 2, pageH - 6, { align: "center" });
  }

  doc.save(`sales-coach-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
