import type PptxGenJSType from 'pptxgenjs';
import { DEFAULT_PRICING_PLANS, PitchTokens, fillToken, formatMeetingDate } from './tokens';
import { resolveSlideContent } from './slideContent';
import { COMPARABLE_MODULES } from './moduleCatalog';
import {
  convertPriceString,
  intervalLabel,
  CURRENCIES,
  TIERS,
  parsePriceBreakdown,
  formatPrice,
  type PitchCurrency,
  type PitchTier,
} from './pricing';

const NAVY = '0F172A';
const CYAN = '22D3EE';
const WHITE = 'FFFFFF';
const SLATE = '475569';
const SLATE_LIGHT = '64748B';
const BG_LIGHT = 'F8FAFC';
const BORDER = 'E2E8F0';
const SUCCESS = '0E7490';

function footer(slide: any, n: number, total: number, label: string, dark = false) {
  const color = dark ? 'FFFFFF66' : '0F172A66';
  slide.addText(`FastCRM · ${label}`, { x: 0.4, y: 7.05, w: 4.5, h: 0.3, fontSize: 9, color, fontFace: 'Calibri', bold: true });
  slide.addText('fastcrm.metodopare.ai', {
    x: 4.9, y: 7.02, w: 3.5, h: 0.35,
    fontSize: 11, color: CYAN, bold: true, align: 'center', fontFace: 'Calibri',
    hyperlink: { url: 'https://fastcrm.metodopare.ai' },
  });
  slide.addText(`${n} / ${total}`, { x: 8.5, y: 7.05, w: 4.4, h: 0.3, fontSize: 9, color, align: 'right', fontFace: 'Calibri', bold: true });
}

function header(slide: any, eyebrow: string, title: string, subtitle?: string, dark = false) {
  slide.addText(eyebrow, {
    x: 0.5, y: 0.45, w: 12, h: 0.3,
    fontSize: 11, bold: true, color: dark ? CYAN : SLATE_LIGHT,
    fontFace: 'Calibri', charSpacing: 4,
  });
  slide.addText(title, {
    x: 0.5, y: 0.8, w: 12, h: 0.9,
    fontSize: 32, bold: true, color: dark ? WHITE : NAVY,
    fontFace: 'Calibri',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 1.7, w: 12, h: 0.7,
      fontSize: 14, color: dark ? 'FFFFFFB3' : SLATE,
      fontFace: 'Calibri',
    });
  }
}

export async function exportPitchToPptx(tokens: PitchTokens) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx: InstanceType<typeof PptxGenJSType> = new (PptxGenJS as any)();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = `Proposta FastCRM — ${tokens.companyName || 'Cliente'}`;
  pptx.author = tokens.presenterName || 'FastCRM';

  const company = fillToken(tokens.companyName, 'a sua empresa');
  const presenter = fillToken(tokens.presenterName, 'Equipa FastCRM');
  const contact = tokens.contactName.trim();
  const date = formatMeetingDate(tokens.meetingDate);
  const enabled = tokens.enabledSlides;
  const required = new Set(['cover', 'next']);
  const coreDefault = ['cover','problem','opportunity','method-pare','intro','how','crm','ai-sdr','inbox','pipeline','marketplace','diff','results','pricing','onboarding','next'];
  const active = new Set<string>(enabled ? [...enabled, ...required] : coreDefault);
  const optionalModules = [
    'mod-revenue','mod-procurement','mod-shop','mod-renewals','mod-support','mod-knowledge',
    'vert-clinics','vert-realestate','vert-training','vert-condos','vert-agencies','vert-restaurants',
    'vert-auto','vert-gyms','vert-beauty','vert-events','vert-construction','vert-legal',
    'pack-billing-pt','pack-b2b-portal','pack-hr','pack-analytics','pack-omnichannel','pack-automations',
    'pack-marketplace-c2c','pack-lives','pack-ai-sdr-deep','pack-pipeline-risk','pack-compliance-rgpd',
    'pack-procurement-pro','pack-knowledge-rag','pack-saas-billing','pack-events-rsvp','pack-loyalty',
  ];
  const total = [...coreDefault, ...optionalModules].filter((id) => active.has(id)).length;
  let n = 0;

  // 1. Cover
  if (active.has('cover')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addShape('rect', { x: 0, y: 7.4, w: 13.333, h: 0.1, fill: { color: CYAN } });
    s.addShape('roundRect', { x: 0.5, y: 0.4, w: 1, h: 1, fill: { color: CYAN }, line: { color: CYAN }, rectRadius: 0.15 });
    s.addText('★', { x: 0.5, y: 0.4, w: 1, h: 1, fontSize: 40, color: NAVY, align: 'center', valign: 'middle', fontFace: 'Calibri', bold: true });
    s.addText('FastCRM', { x: 1.7, y: 0.5, w: 5, h: 0.6, fontSize: 28, bold: true, color: WHITE, fontFace: 'Calibri' });
    s.addText('by Método PARE', { x: 1.7, y: 1.05, w: 5, h: 0.3, fontSize: 11, color: 'FFFFFF99', fontFace: 'Calibri' });

    s.addText('PROPOSTA COMERCIAL', { x: 0.5, y: 2.2, w: 12, h: 0.4, fontSize: 14, color: CYAN, bold: true, fontFace: 'Calibri', charSpacing: 6 });
    s.addText([
      { text: 'Para ', options: { color: WHITE } },
      { text: company, options: { color: CYAN } },
    ], { x: 0.5, y: 2.7, w: 12, h: 1.8, fontSize: 56, bold: true, fontFace: 'Calibri' });
    s.addText('O CRM com IA que unifica vendas, marketing, faturação e atendimento — pensado para PME portuguesas.', {
      x: 0.5, y: 4.7, w: 12, h: 0.8, fontSize: 16, color: 'FFFFFFB3', fontFace: 'Calibri',
    });
    if (contact) {
      s.addText('APRESENTADO A', { x: 0.5, y: 6, w: 4, h: 0.3, fontSize: 9, color: 'FFFFFF80', bold: true, charSpacing: 4, fontFace: 'Calibri' });
      s.addText(contact, { x: 0.5, y: 6.3, w: 5, h: 0.5, fontSize: 18, color: WHITE, bold: true, fontFace: 'Calibri' });
      if (tokens.contactRole) s.addText(tokens.contactRole, { x: 0.5, y: 6.75, w: 5, h: 0.3, fontSize: 12, color: 'FFFFFF99', fontFace: 'Calibri' });
    }
    s.addText('APRESENTADO POR', { x: 8, y: 6, w: 5, h: 0.3, fontSize: 9, color: 'FFFFFF80', bold: true, align: 'right', charSpacing: 4, fontFace: 'Calibri' });
    s.addText(presenter, { x: 8, y: 6.3, w: 5, h: 0.5, fontSize: 18, color: WHITE, bold: true, align: 'right', fontFace: 'Calibri' });
    if (date) s.addText(date, { x: 8, y: 6.75, w: 5, h: 0.3, fontSize: 12, color: 'FFFFFF99', align: 'right', fontFace: 'Calibri' });
    if (tokens.companyLogoUrl) {
      try { s.addImage({ data: tokens.companyLogoUrl, x: 10.5, y: 0.5, w: 2.3, h: 1, sizing: { type: 'contain', w: 2.3, h: 1 } }); } catch {}
    }
  }

  // 2. Problem
  if (active.has('problem')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'O PROBLEMA', 'O dia-a-dia das PME comerciais', 'Mais tempo em tarefas operacionais do que a fechar negócios.');
    const items = [
      { t: 'Leads perdidos', d: 'Equipas perdem 60% dos leads por falta de follow-up rápido e estruturado.' },
      { t: 'Dados dispersos', d: 'Excel, WhatsApp, email — sem vista única do cliente.' },
      { t: 'Sem previsibilidade', d: 'Pipeline pouco fiável, previsão por sentimento.' },
      { t: 'Operação manual', d: 'Mensagens, propostas e faturação consomem o tempo de quem devia vender.' },
    ];
    items.forEach((it, i) => {
      const x = 0.5 + (i % 2) * 6.3;
      const y = 2.6 + Math.floor(i / 2) * 2.1;
      s.addShape('roundRect', { x, y, w: 6, h: 1.9, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.1 });
      s.addText(it.t, { x: x + 0.3, y: y + 0.3, w: 5.6, h: 0.5, fontSize: 18, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(it.d, { x: x + 0.3, y: y + 0.85, w: 5.6, h: 0.9, fontSize: 13, color: SLATE, fontFace: 'Calibri' });
    });
    footer(s, n, total, 'O Problema');
  }

  // 3. Opportunity
  if (active.has('opportunity')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'A OPORTUNIDADE', 'Mercado a digitalizar — quem chega primeiro ganha quota', 'A maioria das PME ainda não tem CRM. Quem automatiza vende mais com a mesma equipa.');
    const stats = [
      { v: '€8B', l: 'Mercado SaaS B2B em PT' },
      { v: '74%', l: 'PME ainda usam Excel' },
      { v: '+38%', l: 'Aumento médio de receita com CRM' },
      { v: '5x', l: 'ROI típico em 12 meses' },
    ];
    stats.forEach((st, i) => {
      const x = 0.5 + (i % 2) * 6.3;
      const y = 2.7 + Math.floor(i / 2) * 2.1;
      s.addShape('rect', { x, y, w: 0.1, h: 1.8, fill: { color: CYAN } });
      s.addShape('rect', { x: x + 0.1, y, w: 5.9, h: 1.8, fill: { color: BG_LIGHT } });
      s.addText(st.v, { x: x + 0.4, y: y + 0.15, w: 5.5, h: 1, fontSize: 48, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(st.l, { x: x + 0.4, y: y + 1.1, w: 5.5, h: 0.6, fontSize: 13, color: NAVY, bold: true, fontFace: 'Calibri' });
    });
    footer(s, n, total, 'Oportunidade');
  }

  // 4. Método PARE
  if (active.has('method-pare')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'A BASE DO SISTEMA', 'Método PARE', 'Quatro pilares que estruturam o FastCRM.');
    const pillars = [
      { L: 'P', n: 'Planeamento', d: 'Pipeline, capacidade da equipa, metas e prioridades.' },
      { L: 'A', n: 'Automação', d: 'IA e workflows — mensagens, propostas, faturação.' },
      { L: 'R', n: 'Resultados', d: 'KPIs, previsão de receita, risco de pipeline.' },
      { L: 'E', n: 'Eficiência', d: 'Mais negócios com menos esforço.' },
    ];
    pillars.forEach((p, i) => {
      const x = 0.5 + i * 3.15;
      s.addShape('roundRect', { x, y: 2.7, w: 3, h: 3.6, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.15 });
      s.addShape('roundRect', { x: x + 0.3, y: 2.95, w: 1.1, h: 1.1, fill: { color: CYAN }, line: { color: CYAN }, rectRadius: 0.15 });
      s.addText(p.L, { x: x + 0.3, y: 2.95, w: 1.1, h: 1.1, fontSize: 48, bold: true, color: NAVY, align: 'center', valign: 'middle', fontFace: 'Calibri' });
      s.addText(p.n, { x: x + 0.3, y: 4.2, w: 2.5, h: 0.5, fontSize: 20, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(p.d, { x: x + 0.3, y: 4.7, w: 2.5, h: 1.5, fontSize: 12, color: SLATE, fontFace: 'Calibri' });
    });
    footer(s, n, total, 'Método PARE');
  }

  // 5. Intro
  if (active.has('intro')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addText('O QUE É O FASTCRM', { x: 0.5, y: 1.5, w: 12, h: 0.4, fontSize: 14, color: CYAN, bold: true, charSpacing: 6, align: 'center', fontFace: 'Calibri' });
    s.addText([
      { text: 'O ', options: { color: WHITE } },
      { text: 'copiloto comercial', options: { color: CYAN } },
      { text: ` que ajuda ${company} a vender mais, com a mesma equipa.`, options: { color: WHITE } },
    ], { x: 1, y: 2.2, w: 11.3, h: 3, fontSize: 40, bold: true, align: 'center', fontFace: 'Calibri' });
    s.addText('CRM, AI SDR, Inbox omnichannel, Faturação, Loja Online e Marketplace — tudo numa única plataforma.', {
      x: 1.5, y: 5.4, w: 10.3, h: 1, fontSize: 16, color: 'FFFFFFB3', align: 'center', fontFace: 'Calibri',
    });
  }

  // 6. How it works
  if (active.has('how')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'COMO FUNCIONA', 'Em 4 passos, do lead à fatura paga');
    const steps = [
      { n: '01', t: 'Captar', d: 'Leads de formulários, loja, WhatsApp ou enriquecimento automático.' },
      { n: '02', t: 'Qualificar', d: 'IA classifica, enriquece e atribui ao gestor certo.' },
      { n: '03', t: 'Engajar', d: 'AI SDR envia sequências multi-canal personalizadas.' },
      { n: '04', t: 'Fechar', d: 'Propostas, faturas e renovações em segundos.' },
    ];
    steps.forEach((st, i) => {
      const x = 0.5 + i * 3.1;
      s.addText(st.n, { x, y: 2.7, w: 3, h: 1.2, fontSize: 56, bold: true, color: CYAN, fontFace: 'Calibri' });
      s.addText(st.t, { x, y: 4, w: 3, h: 0.5, fontSize: 22, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(st.d, { x, y: 4.6, w: 3, h: 1.5, fontSize: 13, color: SLATE, fontFace: 'Calibri' });
    });
    footer(s, n, total, 'Como funciona');
  }

  // 7. CRM
  if (active.has('crm')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'FUNCIONALIDADE #1', 'CRM unificado', 'Contactos, Leads, Empresas e Negócios numa só base — com PARE Score.');
    const bullets = [
      'Vista 360º do cliente: histórico, conversas, faturas',
      'Deduplicação inteligente por NIF, email e telefone',
      'PARE Score — qualificação automática (0–100)',
      'Pipeline visual + previsão de receita',
      'Integrações nativas: GHL, Google, WhatsApp, SMS',
    ];
    s.addText(bullets.map((b) => ({ text: b, options: { bullet: { code: '25CF' }, color: NAVY } })), {
      x: 0.5, y: 2.6, w: 6.3, h: 4, fontSize: 16, fontFace: 'Calibri', paraSpaceAfter: 8,
    });
    s.addShape('roundRect', { x: 7, y: 2.6, w: 5.8, h: 4.2, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.15 });
    s.addText('LEAD CAPTURADO', { x: 7.3, y: 2.85, w: 5.2, h: 0.4, fontSize: 12, bold: true, color: CYAN, charSpacing: 4, fontFace: 'Calibri' });
    s.addText('Ana Ferreira', { x: 7.3, y: 3.3, w: 5.2, h: 0.4, fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri' });
    s.addText('Tech Solutions, Lda · Loja Online', { x: 7.3, y: 3.75, w: 5.2, h: 0.4, fontSize: 14, color: 'FFFFFFB3', fontFace: 'Calibri' });
    s.addText('87', { x: 7.3, y: 4.4, w: 5.2, h: 1.4, fontSize: 80, bold: true, color: CYAN, fontFace: 'Calibri' });
    s.addText('PARE Score', { x: 7.3, y: 5.85, w: 5.2, h: 0.3, fontSize: 11, color: 'FFFFFF80', charSpacing: 3, bold: true, fontFace: 'Calibri' });
    s.addText('✓ NIF · ✓ Email empresarial · ✓ ICP · ⚠ Sem telefone', {
      x: 7.3, y: 6.2, w: 5.2, h: 0.4, fontSize: 11, color: 'FFFFFFCC', fontFace: 'Calibri',
    });
    footer(s, n, total, 'CRM');
  }

  // 8. AI SDR
  if (active.has('ai-sdr')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'FUNCIONALIDADE #2', 'AI SDR & Outbound', 'Sequências multi-canal personalizadas que prospetam 24/7.');
    const items = [
      { t: 'Enriquecimento automático', d: 'Sector, dimensão, faturação e ICP Fit Score.' },
      { t: 'Mensagens com IA', d: 'Gemini gera o copy adaptado ao destinatário.' },
      { t: 'A/B testing automático', d: 'Compara templates e escolhe o vencedor.' },
      { t: 'Hand-off para humano', d: 'Lead respondido entregue ao comercial com contexto.' },
    ];
    items.forEach((it, i) => {
      const y = 2.6 + i * 1.05;
      s.addShape('roundRect', { x: 0.5, y, w: 7.5, h: 0.95, fill: { color: BG_LIGHT }, line: { color: BORDER, width: 1 }, rectRadius: 0.08 });
      s.addText(it.t, { x: 0.7, y: y + 0.1, w: 7.2, h: 0.4, fontSize: 16, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(it.d, { x: 0.7, y: y + 0.5, w: 7.2, h: 0.4, fontSize: 12, color: SLATE, fontFace: 'Calibri' });
    });
    s.addShape('roundRect', { x: 8.3, y: 2.6, w: 4.5, h: 4.2, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.15 });
    s.addText('CANAIS NATIVOS', { x: 8.5, y: 2.85, w: 4.1, h: 0.4, fontSize: 12, bold: true, color: CYAN, charSpacing: 4, fontFace: 'Calibri' });
    const ch = [['Email', '3B82F6'], ['WhatsApp', '16A34A'], ['SMS', 'F59E0B'], ['AI Voice', '8B5CF6']];
    ch.forEach((c, i) => {
      const x = 8.5 + (i % 2) * 2;
      const y = 3.4 + Math.floor(i / 2) * 1;
      s.addShape('roundRect', { x, y, w: 1.8, h: 0.85, fill: { color: c[1] }, line: { color: c[1] }, rectRadius: 0.08 });
      s.addText(c[0], { x, y, w: 1.8, h: 0.85, fontSize: 14, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    });
    s.addShape('roundRect', { x: 8.5, y: 5.6, w: 3.8, h: 1, fill: { color: CYAN }, line: { color: CYAN }, rectRadius: 0.08 });
    s.addText('+62%', { x: 8.5, y: 5.65, w: 3.8, h: 0.55, fontSize: 28, bold: true, color: NAVY, align: 'center', fontFace: 'Calibri' });
    s.addText('meetings vs manual', { x: 8.5, y: 6.15, w: 3.8, h: 0.4, fontSize: 11, color: NAVY, align: 'center', fontFace: 'Calibri' });
    footer(s, n, total, 'AI SDR');
  }

  // 9. Inbox
  if (active.has('inbox')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'FUNCIONALIDADE #3', 'Inbox omnichannel', 'Todos os canais num só inbox — tudo registado no CRM.');
    const ch = [
      'WhatsApp Business', 'Email integrado', 'SMS (Twilio)',
      'Telegram', 'Instagram DM', 'Facebook Messenger',
    ];
    ch.forEach((c, i) => {
      const x = 0.5 + (i % 3) * 4.2;
      const y = 2.6 + Math.floor(i / 3) * 2;
      s.addShape('roundRect', { x, y, w: 4, h: 1.7, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.1 });
      s.addShape('roundRect', { x: x + 0.2, y: y + 0.3, w: 1.1, h: 1.1, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.1 });
      s.addText('★', { x: x + 0.2, y: y + 0.3, w: 1.1, h: 1.1, fontSize: 28, color: CYAN, align: 'center', valign: 'middle', fontFace: 'Calibri' });
      s.addText(c, { x: x + 1.5, y: y + 0.55, w: 2.4, h: 0.6, fontSize: 16, bold: true, color: NAVY, fontFace: 'Calibri' });
    });
    footer(s, n, total, 'Inbox');
  }

  // 10. Pipeline
  if (active.has('pipeline')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'FUNCIONALIDADE #4', 'Pipeline, Propostas e Faturação', 'Do primeiro contacto à fatura paga — sem mudar de plataforma.');
    const stages = [
      { n: 'Lead', c: 42, color: '94A3B8' },
      { n: 'Qualif.', c: 28, color: '3B82F6' },
      { n: 'Proposta', c: 14, color: CYAN },
      { n: 'Negoc.', c: 7, color: '8B5CF6' },
      { n: 'Ganho', c: 4, color: '16A34A' },
    ];
    stages.forEach((st, i) => {
      const x = 0.5 + i * 2.5;
      s.addShape('rect', { x, y: 2.6, w: 2.4, h: 0.1, fill: { color: st.color } });
      s.addShape('rect', { x, y: 2.7, w: 2.4, h: 1.6, fill: { color: BG_LIGHT } });
      s.addText(st.n.toUpperCase(), { x: x + 0.2, y: 2.85, w: 2, h: 0.3, fontSize: 10, bold: true, color: SLATE_LIGHT, charSpacing: 2, fontFace: 'Calibri' });
      s.addText(String(st.c), { x: x + 0.2, y: 3.2, w: 2, h: 0.9, fontSize: 44, bold: true, color: NAVY, fontFace: 'Calibri' });
    });
    const cards = [
      { t: '📄 Propostas em 1 clique', d: 'Templates dinâmicos, assinatura digital e tracking.' },
      { t: '🧾 Faturação certificada', d: 'Faturas em conformidade com a AT, com pagamento integrado.' },
      { t: '🔁 Renovações & MRR', d: 'Contratos recorrentes, alertas de churn, MRR em tempo real.' },
    ];
    cards.forEach((c, i) => {
      const x = 0.5 + i * 4.2;
      s.addShape('roundRect', { x, y: 4.8, w: 4, h: 1.8, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.1 });
      s.addText(c.t, { x: x + 0.2, y: 5, w: 3.6, h: 0.5, fontSize: 16, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(c.d, { x: x + 0.2, y: 5.55, w: 3.6, h: 1, fontSize: 12, color: SLATE, fontFace: 'Calibri' });
    });
    footer(s, n, total, 'Pipeline');
  }

  // 11. Marketplace
  if (active.has('marketplace')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'FUNCIONALIDADE #5', 'Loja, Marketplace e Lead Magnets');
    const cards = [
      { t: 'Loja Online B2C', tag: 'B2C', d: 'Catálogo, checkout, pagamentos (Stripe, MB Way) e cumprimento legal PT.' },
      { t: 'Marketplace C2C/B2B', tag: 'C2C · B2B', d: 'Múltiplos vendedores, reputação, boost de anúncios.' },
      { t: 'Ebooks & Lead Magnets', tag: 'Lead Gen', d: 'Captura de leads via gating de ebooks, integrado no CRM.' },
    ];
    cards.forEach((c, i) => {
      const x = 0.5 + i * 4.2;
      s.addShape('roundRect', { x, y: 2.7, w: 4, h: 3, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.15 });
      s.addText(c.tag.toUpperCase(), { x: x + 0.3, y: 2.95, w: 3.5, h: 0.3, fontSize: 11, bold: true, color: CYAN, charSpacing: 3, fontFace: 'Calibri' });
      s.addText(c.t, { x: x + 0.3, y: 3.4, w: 3.5, h: 0.7, fontSize: 22, bold: true, color: WHITE, fontFace: 'Calibri' });
      s.addText(c.d, { x: x + 0.3, y: 4.3, w: 3.5, h: 1.3, fontSize: 13, color: 'FFFFFFB3', fontFace: 'Calibri' });
    });
    s.addShape('rect', { x: 0.5, y: 6, w: 0.1, h: 1, fill: { color: CYAN } });
    s.addShape('rect', { x: 0.6, y: 6, w: 12.2, h: 1, fill: { color: 'CFFAFE' } });
    s.addText('💡 Cada venda, ebook ou anúncio vira automaticamente uma oportunidade no CRM — fluxo end-to-end.', {
      x: 0.9, y: 6.15, w: 11.7, h: 0.7, fontSize: 14, bold: true, color: NAVY, fontFace: 'Calibri',
    });
    footer(s, n, total, 'Loja & Marketplace');
  }

  // 12. Differentiators
  if (active.has('diff')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'DIFERENCIADORES', 'Porque é que o FastCRM ganha');
    const rows = [
      'CRM + Faturação + Loja num só produto',
      'AI SDR nativo (sem integrações externas)',
      'Pensado para o mercado e legislação PT',
      'Inbox omnichannel completo',
      'Marketplace C2C / Portal B2B incluídos',
      'Pricing transparente, sem custos por contacto',
    ];
    s.addShape('rect', { x: 0.5, y: 2.6, w: 12.3, h: 0.5, fill: { color: NAVY } });
    s.addText('Funcionalidade', { x: 0.7, y: 2.6, w: 7, h: 0.5, fontSize: 14, bold: true, color: WHITE, valign: 'middle', fontFace: 'Calibri' });
    s.addText('FastCRM', { x: 8, y: 2.6, w: 2, h: 0.5, fontSize: 14, bold: true, color: CYAN, align: 'center', valign: 'middle', fontFace: 'Calibri' });
    s.addText('CRM genérico', { x: 10.3, y: 2.6, w: 2.3, h: 0.5, fontSize: 14, bold: true, color: 'FFFFFF99', align: 'center', valign: 'middle', fontFace: 'Calibri' });
    rows.forEach((r, i) => {
      const y = 3.1 + i * 0.55;
      s.addShape('rect', { x: 0.5, y, w: 12.3, h: 0.55, fill: { color: i % 2 === 0 ? WHITE : BG_LIGHT } });
      s.addText(r, { x: 0.7, y, w: 7, h: 0.55, fontSize: 13, color: NAVY, valign: 'middle', fontFace: 'Calibri' });
      s.addText('✓', { x: 8, y, w: 2, h: 0.55, fontSize: 18, bold: true, color: SUCCESS, align: 'center', valign: 'middle', fontFace: 'Calibri' });
      s.addText('✗', { x: 10.3, y, w: 2.3, h: 0.55, fontSize: 18, bold: true, color: '94A3B8', align: 'center', valign: 'middle', fontFace: 'Calibri' });
    });
    footer(s, n, total, 'Diferenciadores');
  }

  // 13. Results
  if (active.has('results')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    header(s, 'RESULTADOS ESPERADOS', `O que ${company} pode esperar`, 'Indicadores médios em PME nos primeiros 90 dias.', true);
    const kpis = [
      { v: '+38%', l: 'Receita por comercial' },
      { v: '−65%', l: 'Tempo em tarefas operacionais' },
      { v: '×3,1', l: 'Conversão lead → cliente' },
      { v: '4,9/5', l: 'Satisfação das equipas' },
    ];
    kpis.forEach((k, i) => {
      const x = 0.5 + i * 3.15;
      s.addShape('roundRect', { x, y: 3, w: 3, h: 3.2, fill: { color: 'FFFFFF14' }, line: { color: 'FFFFFF1A', width: 1 }, rectRadius: 0.15 });
      s.addText(k.v, { x: x + 0.2, y: 3.2, w: 2.6, h: 1.5, fontSize: 60, bold: true, color: CYAN, fontFace: 'Calibri' });
      s.addText(k.l, { x: x + 0.2, y: 4.7, w: 2.6, h: 1.3, fontSize: 14, color: WHITE, fontFace: 'Calibri' });
    });
    footer(s, n, total, 'Resultados', true);
  }

  // 14. Pricing
  if (active.has('pricing')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'INVESTIMENTO', 'Planos e investimento', `Proposta dimensionada para ${company}.`);
    const plans = (tokens.pricingPlans && tokens.pricingPlans.length > 0) ? tokens.pricingPlans : DEFAULT_PRICING_PLANS;
    const cardW = 12 / plans.length - 0.2;
    plans.forEach((p, i) => {
      const x = 0.5 + i * (cardW + 0.2);
      const fill = p.highlight ? 'CFFAFE' : WHITE;
      const border = p.highlight ? CYAN : BORDER;
      s.addShape('roundRect', { x, y: 2.6, w: cardW, h: 4.2, fill: { color: fill }, line: { color: border, width: p.highlight ? 2 : 1 }, rectRadius: 0.12 });
      let cy = 2.8;
      if (p.highlight) {
        s.addShape('roundRect', { x: x + 0.2, y: cy, w: 1.8, h: 0.3, fill: { color: CYAN }, line: { color: CYAN }, rectRadius: 0.05 });
        s.addText('MAIS POPULAR', { x: x + 0.2, y: cy, w: 1.8, h: 0.3, fontSize: 8, bold: true, color: NAVY, align: 'center', valign: 'middle', fontFace: 'Calibri' });
        cy += 0.4;
      }
      s.addText(p.name, { x: x + 0.2, y: cy, w: cardW - 0.4, h: 0.4, fontSize: 18, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(p.price, { x: x + 0.2, y: cy + 0.4, w: cardW - 0.4, h: 0.6, fontSize: 32, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(p.sub, { x: x + 0.2, y: cy + 1, w: cardW - 0.4, h: 0.4, fontSize: 9, color: SLATE_LIGHT, fontFace: 'Calibri' });
      s.addText(
        p.features.slice(0, 7).map((f) => ({ text: f, options: { bullet: { code: '2713' }, color: NAVY } })),
        { x: x + 0.2, y: cy + 1.5, w: cardW - 0.4, h: 2.4, fontSize: 10, fontFace: 'Calibri', paraSpaceAfter: 4 }
      );
    });
    footer(s, n, total, 'Investimento');
  }

  // 15. Onboarding
  if (active.has('onboarding')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, 'ROADMAP', 'Onboarding em 4 semanas', `${presenter} acompanha do dia 1 ao dia 30.`);
    const weeks = [
      { t: 'Setup & Importação', d: 'Workspace, contactos, canais.' },
      { t: 'Formação da equipa', d: 'Workshops com comerciais e gestores.' },
      { t: 'Automações & AI SDR', d: 'Pipelines, sequências, atribuição.' },
      { t: 'Optimização & KPIs', d: 'Métricas, refinamento, cadência mensal.' },
    ];
    weeks.forEach((w, i) => {
      const x = 0.5 + i * 3.15;
      s.addShape('ellipse', { x: x + 0.5, y: 2.7, w: 1, h: 1, fill: { color: NAVY }, line: { color: NAVY } });
      s.addText(String(i + 1), { x: x + 0.5, y: 2.7, w: 1, h: 1, fontSize: 28, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri' });
      s.addText(`SEMANA ${i + 1}`, { x, y: 4, w: 3, h: 0.3, fontSize: 11, bold: true, color: CYAN, charSpacing: 3, fontFace: 'Calibri' });
      s.addText(w.t, { x, y: 4.35, w: 3, h: 0.5, fontSize: 18, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(w.d, { x, y: 4.95, w: 3, h: 1.5, fontSize: 12, color: SLATE, fontFace: 'Calibri' });
    });
    footer(s, n, total, 'Onboarding');
  }

  // ===== Optional module slides (deep-dive) =====
  const moduleLabels: Record<string, string> = {
    'mod-revenue': 'Controlo de Receita',
    'mod-procurement': 'Compras',
    'mod-shop': 'Loja Online',
    'mod-renewals': 'Renovações',
    'mod-support': 'Suporte',
    'mod-knowledge': 'Conhecimento',
    'vert-clinics': 'Clínicas',
    'vert-realestate': 'Imobiliárias',
    'vert-training': 'Formação',
    'vert-condos': 'Condomínios',
    'vert-agencies': 'Agências',
    'vert-restaurants': 'Restauração',
    'vert-auto': 'Auto',
    'vert-gyms': 'Ginásios',
    'vert-beauty': 'Beleza',
    'vert-events': 'Eventos',
    'vert-construction': 'Construção',
    'vert-legal': 'Legal',
    'pack-billing-pt': 'Faturação PT',
    'pack-b2b-portal': 'Portal B2B',
    'pack-hr': 'RH',
    'pack-analytics': 'Analytics',
    'pack-omnichannel': 'Omnichannel',
    'pack-automations': 'Automações',
    'pack-marketplace-c2c': 'Marketplace',
    'pack-lives': 'Lives',
    'pack-ai-sdr-deep': 'AI SDR Pro',
    'pack-pipeline-risk': 'Pipeline Risk',
    'pack-compliance-rgpd': 'RGPD',
    'pack-procurement-pro': 'Compras Pro',
    'pack-knowledge-rag': 'Knowledge RAG',
    'pack-saas-billing': 'SaaS Billing',
    'pack-events-rsvp': 'Eventos RSVP',
    'pack-loyalty': 'Fidelização',
  };
  const renderModuleSlide = (id: string, label: string) => {
    if (!active.has(id)) return;
    n++;
    const c = resolveSlideContent(id, tokens.slideOverrides, {
      currency: tokens.currency,
      interval: tokens.billingInterval,
      tier: tokens.tier,
    });
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    header(s, (c.eyebrow || '').toUpperCase(), c.title || label, c.subtitle);

    // Price badge (top-right) with tier chip + tier limit
    if (c.price) {
      const tierKey = (tokens.tier ?? 'grow') as 'grow' | 'pro' | 'enterprise';
      const tierName = tierKey === 'pro' ? 'Pro' : tierKey === 'enterprise' ? 'Enterprise' : 'Grow';
      const catalogEntry = COMPARABLE_MODULES.find((m) => m.id === id);
      const tierLimit = catalogEntry?.limits[tierKey];
      const badgeH = tierLimit ? 1.7 : 1.2;
      s.addShape('roundRect', { x: 10.3, y: 0.5, w: 2.55, h: badgeH, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.12 });
      s.addText('INVESTIMENTO', { x: 10.4, y: 0.58, w: 1.5, h: 0.22, fontSize: 8, bold: true, color: CYAN, charSpacing: 4, fontFace: 'Calibri' });
      s.addShape('roundRect', { x: 11.95, y: 0.56, w: 0.85, h: 0.27, fill: { color: CYAN }, line: { color: CYAN }, rectRadius: 0.06 });
      s.addText(tierName.toUpperCase(), { x: 11.95, y: 0.56, w: 0.85, h: 0.27, fontSize: 8, bold: true, color: NAVY, align: 'center', valign: 'middle', charSpacing: 2, fontFace: 'Calibri' });
      s.addText(c.price, { x: 10.4, y: 0.92, w: 2.4, h: 0.5, fontSize: 22, bold: true, color: WHITE, align: 'right', fontFace: 'Calibri' });
      if (tierLimit) {
        s.addShape('rect', { x: 10.45, y: 1.43, w: 2.3, h: 0.01, fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF' } });
        s.addText('LIMITE INCLUÍDO', { x: 10.4, y: 1.46, w: 2.4, h: 0.18, fontSize: 7, bold: true, color: '94A3B8', charSpacing: 3, align: 'right', fontFace: 'Calibri' });
        s.addText(tierLimit, { x: 10.4, y: 1.64, w: 2.4, h: 0.22, fontSize: 10, bold: true, color: 'E2E8F0', align: 'right', fontFace: 'Calibri' });
      }
      if (c.priceNote) {
        s.addText(c.priceNote, { x: 9.5, y: 0.5 + badgeH + 0.05, w: 3.35, h: 0.25, fontSize: 9, color: SLATE_LIGHT, align: 'right', italic: true, fontFace: 'Calibri' });
      }
    }

    const stats = (c.stats || []).slice(0, 4);
    if (stats.length > 0) {
      const w = 12 / stats.length - 0.15;
      stats.forEach((st, i) => {
        const x = 0.5 + i * (w + 0.15);
        s.addShape('rect', { x, y: 2.6, w: 0.08, h: 1.3, fill: { color: CYAN } });
        s.addShape('rect', { x: x + 0.08, y: 2.6, w: w - 0.08, h: 1.3, fill: { color: BG_LIGHT } });
        s.addText(st.value, { x: x + 0.25, y: 2.65, w: w - 0.3, h: 0.7, fontSize: 30, bold: true, color: NAVY, fontFace: 'Calibri' });
        s.addText(st.label, { x: x + 0.25, y: 3.3, w: w - 0.3, h: 0.3, fontSize: 11, bold: true, color: NAVY, fontFace: 'Calibri' });
        if (st.sub) s.addText(st.sub, { x: x + 0.25, y: 3.6, w: w - 0.3, h: 0.3, fontSize: 9, color: SLATE_LIGHT, fontFace: 'Calibri' });
      });
    }

    const items = (c.items || []).slice(0, 4);
    const yStart = stats.length > 0 ? 4.15 : 2.7;
    items.forEach((it, i) => {
      const x = 0.5 + (i % 2) * 6.3;
      const y = yStart + Math.floor(i / 2) * 1.3;
      s.addShape('roundRect', { x, y, w: 6, h: 1.2, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.1 });
      s.addShape('roundRect', { x: x + 0.2, y: y + 0.2, w: 0.8, h: 0.8, fill: { color: 'CFFAFE' }, line: { color: 'CFFAFE' }, rectRadius: 0.1 });
      s.addText(String(i + 1).padStart(2, '0'), { x: x + 0.2, y: y + 0.2, w: 0.8, h: 0.8, fontSize: 18, bold: true, color: NAVY, align: 'center', valign: 'middle', fontFace: 'Calibri' });
      s.addText(it.title, { x: x + 1.15, y: y + 0.15, w: 4.7, h: 0.4, fontSize: 14, bold: true, color: NAVY, fontFace: 'Calibri' });
      s.addText(it.text, { x: x + 1.15, y: y + 0.55, w: 4.7, h: 0.65, fontSize: 11, color: SLATE, fontFace: 'Calibri' });
    });

    if (c.extraText) {
      const yE = yStart + Math.ceil(items.length / 2) * 1.3 + 0.1;
      if (yE < 6.6) {
        s.addShape('rect', { x: 0.5, y: yE, w: 0.1, h: 0.7, fill: { color: CYAN } });
        s.addShape('rect', { x: 0.6, y: yE, w: 12.2, h: 0.7, fill: { color: 'CFFAFE' } });
        s.addText(c.extraText, { x: 0.9, y: yE + 0.1, w: 11.7, h: 0.5, fontSize: 12, bold: true, color: NAVY, fontFace: 'Calibri' });
      }
    }

    footer(s, n, total, label);
  };

  Object.entries(moduleLabels).forEach(([id, lbl]) => renderModuleSlide(id, lbl));

  // 16. Next steps
  if (active.has('next')) {
    n++;
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addShape('rect', { x: 0, y: 7.4, w: 13.333, h: 0.1, fill: { color: CYAN } });
    s.addText('PRÓXIMOS PASSOS', { x: 0.5, y: 0.6, w: 12, h: 0.4, fontSize: 14, color: CYAN, bold: true, charSpacing: 6, fontFace: 'Calibri' });
    s.addText(`Vamos avançar com ${company}?`, { x: 0.5, y: 1.1, w: 12, h: 1.4, fontSize: 48, bold: true, color: WHITE, fontFace: 'Calibri' });
    const steps = [
      { n: '01', t: 'Trial de 14 dias', d: 'Acesso completo, sem compromisso.' },
      { n: '02', t: 'Workshop descoberta', d: '60 min para alinhar processos.' },
      { n: '03', t: 'Setup em 48h', d: 'Importação e ativação dos canais.' },
    ];
    steps.forEach((st, i) => {
      const x = 0.5 + i * 4.2;
      s.addShape('roundRect', { x, y: 3.2, w: 4, h: 1.8, fill: { color: 'FFFFFF14' }, line: { color: 'FFFFFF1A', width: 1 }, rectRadius: 0.12 });
      s.addText(st.n, { x: x + 0.3, y: 3.3, w: 1.5, h: 0.7, fontSize: 32, bold: true, color: CYAN, fontFace: 'Calibri' });
      s.addText(st.t, { x: x + 0.3, y: 4, w: 3.6, h: 0.4, fontSize: 16, bold: true, color: WHITE, fontFace: 'Calibri' });
      s.addText(st.d, { x: x + 0.3, y: 4.4, w: 3.6, h: 0.5, fontSize: 11, color: 'FFFFFFB3', fontFace: 'Calibri' });
    });
    s.addShape('roundRect', { x: 0.5, y: 5.4, w: 12.3, h: 1.4, fill: { color: 'FFFFFF14' }, line: { color: 'FFFFFF1A', width: 1 }, rectRadius: 0.12 });
    s.addText('FALAR COM', { x: 0.8, y: 5.55, w: 4, h: 0.3, fontSize: 10, bold: true, color: 'FFFFFF80', charSpacing: 4, fontFace: 'Calibri' });
    s.addText(presenter, { x: 0.8, y: 5.85, w: 5, h: 0.5, fontSize: 22, bold: true, color: WHITE, fontFace: 'Calibri' });
    if (tokens.presenterEmail) s.addText(`✉  ${tokens.presenterEmail}`, { x: 6, y: 5.7, w: 6.5, h: 0.4, fontSize: 14, color: WHITE, fontFace: 'Calibri' });
    if (tokens.presenterPhone) s.addText(`☎  ${tokens.presenterPhone}`, { x: 6, y: 6.15, w: 6.5, h: 0.4, fontSize: 14, color: WHITE, fontFace: 'Calibri' });
    s.addText('fastcrm.metodopare.ai', {
      x: 4.9, y: 7.02, w: 3.5, h: 0.35, fontSize: 12, color: CYAN, bold: true, align: 'center', fontFace: 'Calibri',
      hyperlink: { url: 'https://fastcrm.metodopare.ai' },
    });
  }

  await pptx.writeFile({ fileName: `Proposta-FastCRM-${tokens.companyName || 'Cliente'}.pptx` });
}
