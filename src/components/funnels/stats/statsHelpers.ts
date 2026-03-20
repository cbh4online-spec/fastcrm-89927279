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

// ── Optimization Drawer Types & Logic ──

export interface FunnelHealthScore {
  score: number;
  criticals: number;
  improvements: number;
  good: number;
  breakdown: { label: string; score: number; weight: number }[];
}

export interface ImprovementCard {
  id: string;
  priority: "critical" | "important" | "suggested";
  title: string;
  explanation: string;
  impactFrom: number;
  impactTo: number;
  effort: "low" | "medium" | "high";
  actions: string[];
}

export interface ABTestSuggestion {
  id: string;
  hypothesis: string;
  variantA: string;
  variantB: string;
  metric: string;
  estimatedImpact: string;
}

export function computeFunnelHealthScore(
  convRate: number, bounceRate: number, sources: SourceData[], devices: DeviceData[]
): FunnelHealthScore {
  // Conversion vs benchmark (40%)
  const convScore = Math.min(100, (convRate / DEFAULT_BENCHMARK) * 100);
  // Bounce rate (30%) — lower is better
  const bounceScore = Math.max(0, 100 - bounceRate);
  // Traffic diversity (15%)
  const totalViews = sources.reduce((s, src) => s + src.views, 0);
  const maxSourcePct = totalViews > 0 ? Math.max(...sources.map(s => s.views / totalViews * 100)) : 100;
  const diversityScore = maxSourcePct < 50 ? 100 : maxSourcePct < 70 ? 60 : maxSourcePct < 90 ? 30 : 10;
  // Mobile compat (15%)
  const mobile = devices.find(d => d.name.toLowerCase() === "mobile");
  const desktop = devices.find(d => d.name.toLowerCase() === "desktop");
  const mobileCompat = (!mobile || !desktop || mobile.value === 0)
    ? 70
    : mobile.rate >= desktop.rate * 0.8 ? 100 : mobile.rate >= desktop.rate * 0.5 ? 50 : 20;

  const score = Math.round(convScore * 0.4 + bounceScore * 0.3 + diversityScore * 0.15 + mobileCompat * 0.15);

  const breakdown = [
    { label: "Conversão", score: Math.round(convScore), weight: 40 },
    { label: "Bounce Rate", score: Math.round(bounceScore), weight: 30 },
    { label: "Diversidade Tráfego", score: Math.round(diversityScore), weight: 15 },
    { label: "Compat. Mobile", score: Math.round(mobileCompat), weight: 15 },
  ];

  let criticals = 0, improvements = 0, good = 0;
  for (const b of breakdown) {
    if (b.score < 30) criticals++;
    else if (b.score < 70) improvements++;
    else good++;
  }

  return { score: Math.max(0, Math.min(100, score)), criticals, improvements, good, breakdown };
}

export function generateImprovementCards(
  convRate: number, bounceRate: number, sources: SourceData[],
  devices: DeviceData[], sections: SectionData[], events: StatsEvent[]
): ImprovementCard[] {
  const cards: ImprovementCard[] = [];
  const totalViews = sources.reduce((s, src) => s + src.views, 0);

  if (bounceRate > 80) {
    cards.push({
      id: "high-bounce",
      priority: "critical",
      title: "Landing page não está a reter visitantes",
      explanation: `${bounceRate.toFixed(0)}% dos visitantes saem sem interagir. O conteúdo acima do fold pode não estar alinhado com a audiência ou a página carrega lentamente.`,
      impactFrom: convRate,
      impactTo: convRate + 1.5,
      effort: "medium",
      actions: [
        "Testar novo headline na secção hero",
        "Adicionar social proof (logos, testemunhos) acima do fold",
        "Verificar velocidade de carregamento (PageSpeed)",
        "Garantir CTA visível sem scroll em mobile",
      ],
    });
  }

  if (convRate < DEFAULT_BENCHMARK * 0.5 && totalViews > 20) {
    cards.push({
      id: "low-conversion",
      priority: "critical",
      title: "Taxa de conversão muito abaixo do benchmark",
      explanation: `A tua taxa (${convRate.toFixed(1)}%) é ${Math.round((1 - convRate / DEFAULT_BENCHMARK) * 100)}% inferior à média do setor (${DEFAULT_BENCHMARK}%). O formulário pode ter demasiados campos ou o CTA não é claro.`,
      impactFrom: convRate,
      impactTo: DEFAULT_BENCHMARK,
      effort: "low",
      actions: [
        "Reduzir formulário para máximo 3 campos",
        "Testar CTA com verbo de ação (\"Quero saber mais\" vs \"Submeter\")",
        "Adicionar garantia ou prova de segurança junto ao botão",
        "Testar popup com exit-intent",
      ],
    });
  }

  const deadSource = sources.find(s => s.views >= 30 && s.submissions === 0);
  if (deadSource) {
    cards.push({
      id: `dead-source-${deadSource.name}`,
      priority: "important",
      title: `Tráfego de ${deadSource.name} sem conversões`,
      explanation: `${deadSource.views} visitas de ${deadSource.name} com 0 conversões é anormal. O pixel pode estar a disparar na página errada ou o link UTM está quebrado.`,
      impactFrom: 0,
      impactTo: 2,
      effort: "low",
      actions: [
        "Verificar se o pixel dispara no evento de conversão",
        "Testar o link da campanha em modo incógnito",
        "Confirmar que a landing page corresponde ao criativo do anúncio",
        "Ativar Meta Pixel Helper para diagnóstico",
      ],
    });
  }

  const mobile = devices.find(d => d.name.toLowerCase() === "mobile");
  const desktop = devices.find(d => d.name.toLowerCase() === "desktop");
  if (mobile && desktop && mobile.value > desktop.value && mobile.rate < desktop.rate * 0.5) {
    cards.push({
      id: "mobile-ux",
      priority: "important",
      title: "Experiência mobile está a prejudicar conversões",
      explanation: `Mobile tem ${mobile.value} visitas mas converte a apenas ${mobile.rate.toFixed(1)}%, vs ${desktop.rate.toFixed(1)}% no desktop. A experiência mobile precisa de atenção.`,
      impactFrom: mobile.rate,
      impactTo: desktop.rate * 0.8,
      effort: "medium",
      actions: [
        "Testar formulário em iPhone e Android",
        "Garantir CTA visível sem scroll em mobile",
        "Verificar tamanho de texto e espaçamento (min 44px tap target)",
        "Simplificar layout mobile",
      ],
    });
  }

  if (totalViews > 0) {
    const maxPct = Math.max(...sources.map(s => s.views / totalViews * 100));
    if (maxPct > 70) {
      const topSource = sources.find(s => s.views / totalViews * 100 === maxPct);
      cards.push({
        id: "traffic-diversity",
        priority: "suggested",
        title: "Dependência excessiva de uma única fonte",
        explanation: `${maxPct.toFixed(0)}% do tráfego vem de ${topSource?.name || "uma fonte"}. Uma mudança no algoritmo pode eliminar quase todo o tráfego.`,
        impactFrom: 0,
        impactTo: 0,
        effort: "high",
        actions: [
          "Lançar campanha de email para base existente",
          "Testar Google Ads com as mesmas keywords",
          "Criar conteúdo orgânico (SEO) para tráfego de longo prazo",
          "Ativar retargeting para visitantes que não converteram",
        ],
      });
    }
  }

  const hasSectionData = events.some(e => e.event_type === "section_view");
  if (!hasSectionData && totalViews > 10) {
    cards.push({
      id: "no-section-tracking",
      priority: "suggested",
      title: "Tracking de secções inativo — dados cegos",
      explanation: "Sem scroll tracking, não sabes onde os visitantes abandonam a página. Podes estar a perder conversões numa secção específica.",
      impactFrom: 0,
      impactTo: 0,
      effort: "low",
      actions: [
        "Adicionar atributo data-section a cada secção da landing page",
        "Confirmar que o script de tracking está na versão publicada",
        "Fazer uma visita de teste e verificar na Timeline",
      ],
    });
  }

  return cards;
}

export function generateABTests(convRate: number, bounceRate: number, sources: SourceData[]): ABTestSuggestion[] {
  const tests: ABTestSuggestion[] = [];

  if (convRate < 5) {
    tests.push({
      id: "cta-test",
      hypothesis: "Um CTA mais orientado à ação aumenta a taxa de conversão",
      variantA: "CTA atual (ex: \"Submeter\")",
      variantB: "\"Quero saber mais\" ou \"Agendar Demo\"",
      metric: "Taxa de clique no botão CTA",
      estimatedImpact: "+0.5% a +2% conversão",
    });
  }

  if (bounceRate > 70) {
    tests.push({
      id: "hero-test",
      hypothesis: "Um hero com vídeo retém mais visitantes do que apenas texto",
      variantA: "Hero atual (texto + imagem)",
      variantB: "Hero com vídeo explicativo de 60s",
      metric: "Tempo na página + taxa de conversão",
      estimatedImpact: "-15% bounce rate",
    });
  }

  tests.push({
    id: "form-test",
    hypothesis: "Formulários mais curtos aumentam a taxa de submissão",
    variantA: "Formulário atual (todos os campos)",
    variantB: "Apenas Nome + Email (2 campos)",
    metric: "Taxa de submissão do formulário",
    estimatedImpact: "+1% a +3% conversão",
  });

  return tests.slice(0, 3);
}
