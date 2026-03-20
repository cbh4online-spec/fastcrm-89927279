import { format, parseISO, startOfDay, eachDayOfInterval, subDays } from "date-fns";
import { pt } from "date-fns/locale";

// ── Types ──

export interface StatsEvent {
  id: string;
  event_type: string;
  created_at: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  device_type?: string | null;
  country?: string | null;
  city?: string | null;
  page_section?: string | null;
  session_id?: string | null;
  contact_id?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
}

export interface StatsSummary {
  views: number;
  uniqueViews: number;
  submissions: number;
}

export interface TrendPoint {
  date: string;
  rawDate: string;
  visitantes: number;
  conversões: number;
  taxa: number;
}

export interface SourceData {
  name: string;
  views: number;
  submissions: number;
  rate: number;
}

export interface DeviceData {
  name: string;
  value: number;
  submissions: number;
  rate: number;
}

export interface GeoData {
  name: string;
  country: string;
  city: string | null;
  views: number;
  submissions: number;
  rate: number;
}

export interface SectionData {
  section: string;
  sectionKey: string;
  views: number;
  pct: number;
  dropOff: number | null;
  isWorst: boolean;
}

export interface TimelineEvent {
  type: string;
  time: string;
  rawTime: string;
  device: string;
  source: string;
  location: string;
  sessionId: string | null;
  contactName: string | null;
  contactId: string | null;
}

export interface KPITrend {
  value: number;
  direction: "up" | "down" | "stable";
  label: string;
}

export interface AutoInsight {
  icon: "warning" | "opportunity" | "info";
  text: string;
}

export type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";

// ── Constants ──

export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  problems: "Problemas",
  solution: "Solução",
  transformation: "Transformação",
  testimonials: "Testemunhos",
  video: "Vídeo",
  authority: "Autoridade",
  roi: "ROI",
  "cta-form": "Formulário CTA",
};

export const SECTION_ORDER = [
  "hero", "problems", "solution", "transformation",
  "testimonials", "video", "authority", "roi", "cta-form"
];

export const INDUSTRY_BENCHMARKS: Record<string, { label: string; rate: number }> = {
  saas: { label: "SaaS", rate: 2.5 },
  ecommerce: { label: "E-commerce", rate: 3.2 },
  services: { label: "Serviços", rate: 4.1 },
  real_estate: { label: "Imobiliário", rate: 1.8 },
  restaurants: { label: "Restauração", rate: 5.0 },
  education: { label: "Educação", rate: 3.5 },
};

export const DEFAULT_BENCHMARK = 3.0;

export const KPI_TOOLTIPS: Record<string, string> = {
  visitors: "Total de pageviews da landing page no período selecionado. Inclui visitas repetidas do mesmo utilizador.",
  conversion: "Percentagem de visitantes que submeteram o formulário. Benchmark médio: 3%.",
  submissions: "Número total de formulários submetidos com sucesso (leads capturados).",
  bounce: "Percentagem de visitantes que saíram sem interagir. Abaixo de 60% é considerado bom.",
  sessions: "Visitantes únicos identificados por sessão. Um utilizador pode ter múltiplas sessões.",
};

// ── Helpers ──

export function computeDateRange(preset: DatePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case "today": from.setHours(0, 0, 0, 0); break;
    case "7d": from.setDate(from.getDate() - 7); break;
    case "30d": from.setDate(from.getDate() - 30); break;
    case "90d": from.setDate(from.getDate() - 90); break;
    default: from.setDate(from.getDate() - 30);
  }
  return { from, to };
}

export function computeTrend(events: StatsEvent[], type: "view" | "form_submit"): KPITrend {
  const filtered = events.filter(e => e.event_type === type);
  if (filtered.length < 2) return { value: 0, direction: "stable", label: "sem dados" };

  const sorted = [...filtered].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint).length;
  const secondHalf = sorted.slice(midpoint).length;

  if (firstHalf === 0) return { value: 100, direction: "up", label: "vs período anterior" };
  const change = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
  return {
    value: Math.abs(change),
    direction: change > 2 ? "up" : change < -2 ? "down" : "stable",
    label: "vs período anterior",
  };
}

export function computeBounceRateTrend(events: StatsEvent[]): KPITrend {
  const views = events.filter(e => e.event_type === "view");
  if (views.length < 4) return { value: 0, direction: "stable", label: "sem dados" };

  const sorted = [...views].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const mid = Math.floor(sorted.length / 2);
  const subs = events.filter(e => e.event_type === "form_submit");

  const firstViews = sorted.slice(0, mid).length;
  const secondViews = sorted.slice(mid).length;
  const firstSubs = subs.filter(s => s.created_at <= sorted[mid - 1].created_at).length;
  const secondSubs = subs.filter(s => s.created_at > sorted[mid - 1].created_at).length;

  const firstBounce = firstViews > 0 ? ((firstViews - firstSubs) / firstViews) * 100 : 0;
  const secondBounce = secondViews > 0 ? ((secondViews - secondSubs) / secondViews) * 100 : 0;
  const change = Math.round(secondBounce - firstBounce);

  return {
    value: Math.abs(change),
    direction: change > 2 ? "up" : change < -2 ? "down" : "stable",
    label: "vs período anterior",
  };
}

export function computeTrendData(events: StatsEvent[]): TrendPoint[] {
  if (events.length === 0) return [];
  const viewEvents = events.filter(e => e.event_type === "view");
  const submitEvents = events.filter(e => e.event_type === "form_submit");
  if (viewEvents.length === 0) return [];

  const sorted = [...viewEvents].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const minDate = parseISO(sorted[0].created_at);
  const maxDate = parseISO(sorted[sorted.length - 1].created_at);
  const days = eachDayOfInterval({ start: startOfDay(minDate), end: startOfDay(maxDate) });

  return days.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayViews = viewEvents.filter(e => e.created_at.startsWith(dayStr)).length;
    const daySubs = submitEvents.filter(e => e.created_at.startsWith(dayStr)).length;
    return {
      date: format(day, "dd MMM", { locale: pt }),
      rawDate: dayStr,
      visitantes: dayViews,
      conversões: daySubs,
      taxa: dayViews > 0 ? Math.round((daySubs / dayViews) * 1000) / 10 : 0,
    };
  });
}

export function computeSourceBreakdown(events: StatsEvent[]): SourceData[] {
  const sources: Record<string, { views: number; submissions: number }> = {};
  for (const e of events) {
    const src = e.utm_source || e.referrer || "directo";
    const label = src.replace(/^https?:\/\//, "").split("/")[0].substring(0, 30);
    if (!sources[label]) sources[label] = { views: 0, submissions: 0 };
    if (e.event_type === "view") sources[label].views++;
    else if (e.event_type === "form_submit") sources[label].submissions++;
  }
  return Object.entries(sources)
    .map(([name, v]) => ({ name, ...v, rate: v.views > 0 ? (v.submissions / v.views) * 100 : 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);
}

export function computeDeviceBreakdown(events: StatsEvent[]): DeviceData[] {
  const devices: Record<string, { views: number; submissions: number }> = {};
  for (const e of events) {
    const d = e.device_type || "desconhecido";
    if (!devices[d]) devices[d] = { views: 0, submissions: 0 };
    if (e.event_type === "view") devices[d].views++;
    else if (e.event_type === "form_submit") devices[d].submissions++;
  }
  return Object.entries(devices).map(([name, v]) => ({
    name,
    value: v.views,
    submissions: v.submissions,
    rate: v.views > 0 ? (v.submissions / v.views) * 100 : 0,
  }));
}

export function computeGeoBreakdown(events: StatsEvent[]): GeoData[] {
  const geo: Record<string, { country: string; city: string | null; views: number; submissions: number }> = {};
  for (const e of events) {
    if (!e.country) continue;
    const key = e.city ? `${e.city}, ${e.country}` : e.country;
    if (!geo[key]) geo[key] = { country: e.country, city: e.city || null, views: 0, submissions: 0 };
    if (e.event_type === "view") geo[key].views++;
    else if (e.event_type === "form_submit") geo[key].submissions++;
  }
  return Object.entries(geo)
    .map(([name, v]) => ({ name, ...v, rate: v.views > 0 ? (v.submissions / v.views) * 100 : 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);
}

export function computeSectionHeatmap(events: StatsEvent[], totalViews: number): SectionData[] {
  const sectionEvents = events.filter(e => e.event_type === "section_view" && e.page_section);
  const sections: Record<string, number> = {};
  for (const e of sectionEvents) sections[e.page_section!] = (sections[e.page_section!] || 0) + 1;

  const data = SECTION_ORDER.map(sec => ({
    section: SECTION_LABELS[sec] || sec,
    sectionKey: sec,
    views: sections[sec] || 0,
    pct: totalViews > 0 ? (sections[sec] || 0) / totalViews * 100 : 0,
    dropOff: 0 as number | null,
    isWorst: false,
  }));

  let worstIdx = -1;
  let worstDrop = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1].views > 0) {
      const drop = Math.round((1 - data[i].views / data[i - 1].views) * 100);
      data[i].dropOff = drop > 0 ? drop : null;
      if (drop > worstDrop) { worstDrop = drop; worstIdx = i; }
    }
  }
  if (worstIdx >= 0) data[worstIdx].isWorst = true;

  return data;
}

export function computeTimeline(events: StatsEvent[]): TimelineEvent[] {
  return events
    .filter(e => e.event_type === "view" || e.event_type === "form_submit")
    .slice(-50)
    .reverse()
    .map(e => {
      let source = "directo";
      try {
        source = e.utm_source || (e.referrer ? new URL(e.referrer).hostname : "directo");
      } catch { source = e.referrer?.substring(0, 30) || "directo"; }
      return {
        type: e.event_type,
        time: format(parseISO(e.created_at), "dd MMM HH:mm", { locale: pt }),
        rawTime: e.created_at,
        device: e.device_type || "desktop",
        source,
        location: e.country ? (e.city ? `${e.city}, ${e.country}` : e.country) : "—",
        sessionId: e.session_id || null,
        contactName: (e as any).contact_name || null,
        contactId: (e as any).contact_id || null,
      };
    });
}

export function generateAutoInsights(
  totalViews: number, totalSubmissions: number, bounceRate: number,
  convRate: number, sources: SourceData[]
): AutoInsight[] {
  const insights: AutoInsight[] = [];

  if (bounceRate > 85) {
    insights.push({
      icon: "warning",
      text: `O teu Bounce Rate (${bounceRate.toFixed(1)}%) está ${Math.round(bounceRate - 60)}pp acima do ideal. A maioria dos visitantes sai sem interagir.`,
    });
  }

  const bestSource = sources.find(s => s.rate > 0 && s.views >= 5);
  if (bestSource) {
    insights.push({
      icon: "opportunity",
      text: `${bestSource.name} converte a ${bestSource.rate.toFixed(1)}% — considera aumentar o investimento nesta fonte.`,
    });
  }

  const deadSource = sources.find(s => s.views >= 10 && s.submissions === 0);
  if (deadSource) {
    insights.push({
      icon: "warning",
      text: `${deadSource.views} visitas de ${deadSource.name} com 0 conversões — verifica se o link de tracking e a landing page estão alinhados.`,
    });
  }

  if (convRate < DEFAULT_BENCHMARK && totalViews > 20) {
    insights.push({
      icon: "info",
      text: `A tua taxa de conversão (${convRate.toFixed(1)}%) está abaixo do benchmark do setor (${DEFAULT_BENCHMARK}%). Revê o copy do CTA e a proposta de valor.`,
    });
  }

  if (totalViews > 0 && totalSubmissions > 0 && convRate > 5) {
    insights.push({
      icon: "opportunity",
      text: `Excelente! A tua taxa de ${convRate.toFixed(1)}% está acima da média. Considera escalar o tráfego para maximizar resultados.`,
    });
  }

  return insights.slice(0, 3);
}

export function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  const sumX = data.reduce((s, d) => s + d.x, 0);
  const sumY = data.reduce((s, d) => s + d.y, 0);
  const sumXY = data.reduce((s, d) => s + d.x * d.y, 0);
  const sumX2 = data.reduce((s, d) => s + d.x * d.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function getPerformanceBadge(rate: number): { label: string; color: string } {
  if (rate >= 5) return { label: "Alto", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
  if (rate >= 1) return { label: "Médio", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
  return { label: "Baixo", color: "bg-red-500/20 text-red-400 border-red-500/30" };
}

export function getSourceRecommendation(source: SourceData): string {
  if (source.views >= 20 && source.submissions === 0) return "Verificar tracking / relevância da LP";
  if (source.rate >= 5) return "Aumentar investimento";
  if (source.name === "directo") return "Criar campanhas UTM para rastrear";
  if (source.rate >= 1) return "Otimizar landing page para esta fonte";
  if (source.views < 5) return "Insuficiente para análise";
  return "Testar novo copy/oferta";
}

export function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    "Portugal": "🇵🇹", "Brazil": "🇧🇷", "Brasil": "🇧🇷", "Spain": "🇪🇸", "Espanha": "🇪🇸",
    "United States": "🇺🇸", "USA": "🇺🇸", "United Kingdom": "🇬🇧", "UK": "🇬🇧",
    "France": "🇫🇷", "Germany": "🇩🇪", "Italy": "🇮🇹", "Netherlands": "🇳🇱",
    "Canada": "🇨🇦", "Angola": "🇦🇴", "Mozambique": "🇲🇿",
  };
  return flags[country] || "🌍";
}

export function exportToCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
}
