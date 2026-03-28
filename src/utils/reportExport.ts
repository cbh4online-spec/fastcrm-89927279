import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SalesKPI, LeadFlowWeek, WonRevenueMonth, FunnelData, TopPerformer, SourceBreakdown, StageDurationData, DealForecastStage, SalesVelocity } from "@/hooks/useSalesPerformance";

// --- Generic CSV ---

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvLine(values: (string | number | undefined)[]): string {
  return values.map(v => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",");
}

// --- Sales Report CSV ---

interface SalesReportData {
  kpis?: SalesKPI[];
  leadFlow?: LeadFlowWeek[];
  sources?: string[];
  wonRevenueByMonth?: WonRevenueMonth[];
  funnel?: FunnelData;
  velocity?: SalesVelocity;
  topPerformers?: TopPerformer[];
  sourceBreakdown?: SourceBreakdown[];
  stageDuration?: StageDurationData[];
  dealForecast?: DealForecastStage[];
}

export function exportSalesReportCSV(data: SalesReportData) {
  const BOM = "\uFEFF";
  const lines: string[] = [];
  const date = new Date().toLocaleDateString("pt-PT");

  lines.push("=== SALES PERFORMANCE REPORT ===");
  lines.push(`Date: ${date}`);
  lines.push("");

  // KPIs
  if (data.kpis?.length) {
    lines.push("--- KPIs ---");
    lines.push(csvLine(["Metric", "Value"]));
    data.kpis.forEach(k => lines.push(csvLine([k.label, k.formatted])));
    lines.push("");
  }

  // Lead Flow
  if (data.leadFlow?.length && data.sources?.length) {
    lines.push("--- Lead Flow (Weekly) ---");
    lines.push(csvLine(["Week", ...data.sources]));
    data.leadFlow.forEach(w => {
      lines.push(csvLine([w.week, ...data.sources!.map(s => w[s] as number)]));
    });
    lines.push("");
  }

  // Won Revenue
  if (data.wonRevenueByMonth?.length) {
    lines.push("--- Won Revenue by Month ---");
    lines.push(csvLine(["Month", "Value"]));
    data.wonRevenueByMonth.forEach(m => lines.push(csvLine([m.month, m.value])));
    lines.push("");
  }

  // Funnel
  if (data.funnel?.current?.length) {
    lines.push("--- Conversion Funnel (Current) ---");
    lines.push(csvLine(["Stage", "Count", "Percentage"]));
    data.funnel.current.forEach(s => lines.push(csvLine([s.name, s.count, `${s.percentage}%`])));
    lines.push("");
  }

  // Stage Duration
  if (data.stageDuration?.length) {
    lines.push("--- Stage Duration ---");
    lines.push(csvLine(["Stage", "Avg Days", "Min", "Max", "Deals", "Expected", "Heat Ratio"]));
    data.stageDuration.forEach(s => lines.push(csvLine([
      s.stage_name, Math.round(s.avg_days), s.min_days, s.max_days, s.deal_count, s.expected_days, s.heat_ratio.toFixed(2),
    ])));
    lines.push("");
  }

  // Deal Forecast
  if (data.dealForecast?.length) {
    lines.push("--- Deal Forecast ---");
    lines.push(csvLine(["Stage", "Total Value", "Weighted Value", "Probability", "Deals"]));
    data.dealForecast.forEach(s => lines.push(csvLine([
      s.stage_name, s.total_value, s.weighted_value.toFixed(0), `${s.probability}%`, s.deal_count,
    ])));
    lines.push("");
  }

  // Top Performers
  if (data.topPerformers?.length) {
    lines.push("--- Top Performers ---");
    lines.push(csvLine(["Name", "Won Value", "Deals", "Win Rate"]));
    data.topPerformers.forEach(p => lines.push(csvLine([p.name, p.won_value, p.deal_count, `${p.win_rate.toFixed(1)}%`])));
    lines.push("");
  }

  // Source Breakdown
  if (data.sourceBreakdown?.length) {
    lines.push("--- Source Analysis ---");
    lines.push(csvLine(["Source", "Count", "Percentage"]));
    data.sourceBreakdown.forEach(s => lines.push(csvLine([s.source, s.count, `${s.percentage}%`])));
    lines.push("");
  }

  // Velocity
  if (data.velocity) {
    lines.push("--- Sales Velocity ---");
    lines.push(csvLine(["Metric", "Value"]));
    lines.push(csvLine(["Active Deals", data.velocity.deals]));
    lines.push(csvLine(["Avg Deal Value", data.velocity.avgValue.toFixed(0)]));
    lines.push(csvLine(["Win Rate", `${data.velocity.winRate.toFixed(1)}%`]));
    lines.push(csvLine(["Avg Cycle (days)", data.velocity.avgCycleDays]));
    lines.push(csvLine(["Velocity (EUR/day)", data.velocity.velocity.toFixed(0)]));
  }

  downloadFile(BOM + lines.join("\n"), `sales-report-${date.replace(/\//g, "-")}.csv`, "text/csv;charset=utf-8");
}

// --- Sales Report PDF ---

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `EUR ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `EUR ${(v / 1_000).toFixed(1)}K`;
  return `EUR ${v.toFixed(0)}`;
}

export function exportSalesReportPDF(data: SalesReportData) {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString("pt-PT");
  let y = 20;

  doc.setFontSize(18);
  doc.text("Sales Performance Report", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${date}`, 14, y);
  doc.setTextColor(0);
  y += 12;

  // KPIs
  if (data.kpis?.length) {
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: data.kpis.map(k => [k.label.replace(/_/g, " ").toUpperCase(), k.formatted]),
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Funnel
  if (data.funnel?.current?.length) {
    doc.setFontSize(12);
    doc.text("Conversion Funnel", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Stage", "Count", "%"]],
      body: data.funnel.current.map(s => [s.name, s.count, `${s.percentage}%`]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Top Performers
  if (data.topPerformers?.length) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.text("Top Performers", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Name", "Won Value", "Deals", "Win Rate"]],
      body: data.topPerformers.map(p => [p.name, fmtCurrency(p.won_value), p.deal_count, `${p.win_rate.toFixed(1)}%`]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Deal Forecast
  if (data.dealForecast?.length) {
    if (y > 230) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.text("Deal Forecast", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Stage", "Total", "Weighted", "Prob.", "Deals"]],
      body: data.dealForecast.map(s => [s.stage_name, fmtCurrency(s.total_value), fmtCurrency(s.weighted_value), `${s.probability}%`, s.deal_count]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Stage Duration
  if (data.stageDuration?.length) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.text("Stage Duration", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Stage", "Avg Days", "Min", "Max", "Deals"]],
      body: data.stageDuration.map(s => [s.stage_name, Math.round(s.avg_days), s.min_days, s.max_days, s.deal_count]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 },
    });
  }

  // Source
  if (data.sourceBreakdown?.length) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.text("Source Analysis", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Source", "Count", "%"]],
      body: data.sourceBreakdown.map(s => [s.source, s.count, `${s.percentage}%`]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(`sales-report-${date.replace(/\//g, "-")}.pdf`);
}

// --- Generic widget export for dashboards ---

export function exportWidgetsCSV(dashboardName: string, widgets: { title: string; data?: any[] }[]) {
  const BOM = "\uFEFF";
  const lines: string[] = [];
  const date = new Date().toLocaleDateString("pt-PT");

  lines.push(`=== ${dashboardName.toUpperCase()} ===`);
  lines.push(`Date: ${date}`);
  lines.push("");

  widgets.forEach(w => {
    lines.push(`--- ${w.title} ---`);
    if (w.data?.length) {
      const keys = Object.keys(w.data[0]);
      lines.push(csvLine(keys));
      w.data.forEach(row => lines.push(csvLine(keys.map(k => row[k]))));
    } else {
      lines.push("No data");
    }
    lines.push("");
  });

  downloadFile(BOM + lines.join("\n"), `${dashboardName.replace(/\s+/g, "-").toLowerCase()}-${date.replace(/\//g, "-")}.csv`, "text/csv;charset=utf-8");
}
