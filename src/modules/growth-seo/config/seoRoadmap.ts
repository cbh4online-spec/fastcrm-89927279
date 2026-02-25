// =============================================
// SEO ROADMAP - 90 DAY PLAN
// =============================================

export interface RoadmapPhase {
  id: string;
  name: string;
  days: string;
  color: 'green' | 'yellow' | 'red';
  objective: string;
  categories: RoadmapCategory[];
  kpis: string[];
}

export interface RoadmapCategory {
  name: string;
  tasks: RoadmapTask[];
}

export interface RoadmapTask {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  dueDay?: number;
}

export const seoRoadmap: RoadmapPhase[] = [
  {
    id: 'phase-1',
    name: 'Fundação + Primeiros Wins',
    days: '1-30',
    color: 'green',
    objective: 'Indexar, validar e converter',
    categories: [
      {
        name: 'SEO Técnico',
        tasks: [
          { id: 't1-1', title: 'Sitemap + robots.txt', priority: 'high', status: 'done' },
          { id: 't1-2', title: 'Titles/metas dinâmicos', priority: 'high', status: 'done' },
          { id: 't1-3', title: 'Indexação só de páginas públicas', priority: 'high', status: 'done' },
          { id: 't1-4', title: 'Schema markup (JSON-LD)', priority: 'medium', status: 'done' },
        ],
      },
      {
        name: 'Conteúdo',
        tasks: [
          { id: 't1-5', title: '50-100 páginas de keywords principais', priority: 'high', status: 'in_progress', dueDay: 20 },
          { id: 't1-6', title: 'Páginas de tools', priority: 'high', status: 'in_progress', dueDay: 15 },
          { id: 't1-7', title: 'Templates core', priority: 'medium', status: 'done', dueDay: 25 },
          { id: 't1-8', title: 'Exemplos reais em cada página', priority: 'high', status: 'todo', dueDay: 30 },
          { id: 't1-9', title: 'CTA "Generate keyword ideas" em todas', priority: 'high', status: 'done' },
        ],
      },
      {
        name: 'Tracking',
        tasks: [
          { id: 't1-10', title: 'GA4 + GTM configurado', priority: 'high', status: 'done' },
          { id: 't1-11', title: 'Meta Pixel ativo', priority: 'medium', status: 'done' },
          { id: 't1-12', title: 'Microsoft Clarity ativo', priority: 'medium', status: 'done' },
          { id: 't1-13', title: 'Funnel SEO → Generate → Signup validado', priority: 'high', status: 'in_progress', dueDay: 30 },
        ],
      },
    ],
    kpis: [
      'Páginas indexadas',
      'CTR orgânico',
      'Generate keywords started',
    ],
  },
  {
    id: 'phase-2',
    name: 'Escala Inteligente',
    days: '31-60',
    color: 'yellow',
    objective: 'Volume + intenção',
    categories: [
      {
        name: 'SEO Programático',
        tasks: [
          { id: 't2-1', title: '+300-1000 páginas long-tail keywords', priority: 'high', status: 'todo', dueDay: 45 },
          { id: 't2-2', title: 'Páginas de categorias', priority: 'high', status: 'todo', dueDay: 40 },
          { id: 't2-3', title: 'Glossary completo', priority: 'medium', status: 'todo', dueDay: 50 },
          { id: 't2-4', title: 'Criar /compare/* (alta intenção)', priority: 'high', status: 'done', dueDay: 55 },
        ],
      },
      {
        name: 'Conteúdo',
        tasks: [
          { id: 't2-5', title: 'FAQs automáticas', priority: 'high', status: 'done' },
          { id: 't2-6', title: 'Melhorar páginas com bounce alto (Clarity)', priority: 'medium', status: 'todo', dueDay: 50 },
        ],
      },
      {
        name: 'Growth',
        tasks: [
          { id: 't2-7', title: 'Retargeting Meta: generated but not exported', priority: 'medium', status: 'todo', dueDay: 45 },
          { id: 't2-8', title: 'Melhorar CTAs com base em heatmaps', priority: 'medium', status: 'todo', dueDay: 55 },
        ],
      },
    ],
    kpis: [
      'Sessões orgânicas',
      'Generate completed',
      'Signup rate',
    ],
  },
  {
    id: 'phase-3',
    name: 'Autoridade + Conversão',
    days: '61-90',
    color: 'red',
    objective: 'Posicionar como referência',
    categories: [
      {
        name: 'SEO Avançado',
        tasks: [
          { id: 't3-1', title: 'Internal linking automático', priority: 'high', status: 'todo', dueDay: 70 },
          { id: 't3-2', title: 'Atualização de páginas antigas (freshness)', priority: 'medium', status: 'todo', dueDay: 75 },
          { id: 't3-3', title: 'Schema expandido', priority: 'medium', status: 'todo', dueDay: 80 },
        ],
      },
      {
        name: 'Conteúdo Premium',
        tasks: [
          { id: 't3-4', title: 'Keyword data insights (dados reais)', priority: 'high', status: 'todo', dueDay: 75 },
          { id: 't3-5', title: 'Páginas "Top keyword ideas for X in 2026"', priority: 'high', status: 'todo', dueDay: 85 },
        ],
      },
      {
        name: 'Conversão',
        tasks: [
          { id: 't3-6', title: 'Testar export como gatilho pago', priority: 'high', status: 'todo', dueDay: 70 },
          { id: 't3-7', title: 'Testar limites free vs paid', priority: 'high', status: 'todo', dueDay: 75 },
          { id: 't3-8', title: 'Refinar pricing page', priority: 'medium', status: 'todo', dueDay: 90 },
        ],
      },
    ],
    kpis: [
      'Keywords top-10',
      'Export → Upgrade rate',
      'Receita orgânica',
    ],
  },
];

export const goldenRule = 'SEO só funciona se cada página fizer o user agir. Se não gera keywords → não serve.';

export function getCurrentPhase(dayNumber: number): RoadmapPhase | undefined {
  if (dayNumber <= 30) return seoRoadmap[0];
  if (dayNumber <= 60) return seoRoadmap[1];
  if (dayNumber <= 90) return seoRoadmap[2];
  return undefined;
}

export function getPhaseProgress(phase: RoadmapPhase): number {
  const allTasks = phase.categories.flatMap(c => c.tasks);
  const doneTasks = allTasks.filter(t => t.status === 'done').length;
  return Math.round((doneTasks / allTasks.length) * 100);
}

export function getTotalProgress(): number {
  const allTasks = seoRoadmap.flatMap(p => p.categories.flatMap(c => c.tasks));
  const doneTasks = allTasks.filter(t => t.status === 'done').length;
  return Math.round((doneTasks / allTasks.length) * 100);
}
