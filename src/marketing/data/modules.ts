/**
 * Módulos destacados no site marketing — agrupados em 4 pilares.
 * Mantém consistência com o pitch deck e a sidebar do produto.
 */
import {
  Users, Brain, Mail, ShoppingBag, Sparkles, Zap, Target, Calendar,
  TrendingUp, MessageSquare, FileText, BarChart3, Bot, Search,
  Megaphone, Layers, Receipt, Globe, Phone, Shield,
  type LucideIcon,
} from "lucide-react";

export interface ModuleItem {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets?: string[];
}

export interface ModulePillar {
  slug: "crm" | "ai-sdr" | "marketing" | "comercio";
  label: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  hero: string;
  modules: ModuleItem[];
}

export const PILLARS: ModulePillar[] = [
  {
    slug: "crm",
    label: "Core CRM",
    tagline: "A sua operação comercial, organizada e previsível.",
    description:
      "Pipeline, contactos, empresas, negócios e tarefas — tudo numa vista única, com histórico, automações e relatórios em tempo real.",
    icon: Users,
    hero: "O CRM que devolve à equipa o tempo perdido em Excel e WhatsApp.",
    modules: [
      {
        title: "Contactos & Empresas",
        description: "Vista 360º de cada cliente, com timeline, ENI, ciclo de vida e duplicados unificados.",
        icon: Users,
        bullets: ["Importação CSV", "Detecção de duplicados", "Timeline completo", "Lifecycle stages"],
      },
      {
        title: "Pipeline & Negócios",
        description: "Kanban com drag-and-drop, probabilidade ponderada e previsão de receita por período.",
        icon: Target,
        bullets: ["Múltiplos pipelines", "Previsão de receita", "Risco de pipeline IA", "Stages customizáveis"],
      },
      {
        title: "Tarefas & Calendário",
        description: "Atividades automáticas por estado do negócio, sincronização com Google Calendar.",
        icon: Calendar,
      },
      {
        title: "Relatórios & KPIs",
        description: "Dashboards executivos, KPIs por equipa, leaderboard e modo TV para escritório.",
        icon: BarChart3,
      },
      {
        title: "Account Brief",
        description: "Inteligência sobre cada conta: identidade, sinais, oportunidades e personalização.",
        icon: Layers,
      },
      {
        title: "Faturação & Renovações",
        description: "Faturas com SAF-T, recorrências, renovações automáticas e MRR em tempo real.",
        icon: Receipt,
      },
    ],
  },
  {
    slug: "ai-sdr",
    label: "AI SDR & Outbound",
    tagline: "O comercial que nunca dorme.",
    description:
      "Prospeção, enriquecimento, sequências multi-canal e qualificação automática — feito por agentes de IA dedicados ao seu funil.",
    icon: Brain,
    hero: "10x mais leads qualificadas, com a mesma equipa.",
    modules: [
      {
        title: "AI SDR",
        description: "Sequências outbound personalizadas em Email, WhatsApp e SMS, com follow-up automático.",
        icon: Bot,
        bullets: ["Cadências multi-canal", "Personalização IA", "A/B test automático", "Reply detection"],
      },
      {
        title: "Lead Enricher Pro",
        description: "Enriquece leads com dados corporativos, sinais de crescimento e contactos públicos.",
        icon: Sparkles,
      },
      {
        title: "Account Brief Intelligence",
        description: "Briefing automático de cada conta: setor, sinais, financeiro, decisores.",
        icon: Search,
      },
      {
        title: "Prospecting (Google Local + Web + Pros)",
        description: "Encontra empresas e profissionais por critérios geográficos e setoriais.",
        icon: Globe,
      },
      {
        title: "AI Sales Coach",
        description: "Treino contínuo com sugestões de mensagem, tom e próximas ações por negócio.",
        icon: Zap,
      },
      {
        title: "AI Employees & Agents",
        description: "Bots dedicados que executam tarefas reais (qualificar, agendar, escrever propostas).",
        icon: Brain,
      },
    ],
  },
  {
    slug: "marketing",
    label: "Marketing & Conteúdo",
    tagline: "Capta, nutre e converte — em piloto automático.",
    description:
      "Funis, landing pages, email, WhatsApp, bio links, ebooks e blog — tudo conectado ao CRM, com tracking e atribuição.",
    icon: Megaphone,
    hero: "Toda a sua presença digital, num único motor de crescimento.",
    modules: [
      {
        title: "Email Marketing",
        description: "Campanhas, sequências, segmentação dinâmica e otimização IA do assunto e horário.",
        icon: Mail,
        bullets: ["AI subject lines", "Smart send time", "A/B test", "Deliverability monitor"],
      },
      {
        title: "WhatsApp Business",
        description: "Inbox unificada, templates, automações e atendimento via QR ou API oficial.",
        icon: MessageSquare,
      },
      {
        title: "Funis & Landing Pages",
        description: "Páginas de venda, formulários, upsell, downsell e checkout integrado.",
        icon: TrendingUp,
      },
      {
        title: "Bio Links",
        description: "Página de bio personalizada, links curtos, tracking e sincronização com CRM.",
        icon: Globe,
      },
      {
        title: "Blog & Ebooks",
        description: "Conteúdo SEO + ebooks gated para captação de leads.",
        icon: FileText,
      },
      {
        title: "Conversational Engine",
        description: "Chatbots, voice agents e qualificação automática em qualquer canal.",
        icon: Phone,
      },
    ],
  },
  {
    slug: "comercio",
    label: "Comércio & Checkout",
    tagline: "Vender online, presencialmente ou em live — tudo num lugar.",
    description:
      "Loja online B2C, marketplace C2C, lives commerce, portal B2B, checkout otimizado e recuperação de carrinho.",
    icon: ShoppingBag,
    hero: "A infraestrutura comercial completa para vender em todos os canais.",
    modules: [
      {
        title: "Loja Online",
        description: "Catálogo, carrinho, cupões, reviews, devoluções e analytics integrados.",
        icon: ShoppingBag,
        bullets: ["Multi-categoria", "Cupões dinâmicos", "Reviews com fotos", "Devoluções"],
      },
      {
        title: "Marketplace C2C",
        description: "Marketplace multi-vendedor com listings, sponsors, boost e disputas.",
        icon: Layers,
      },
      {
        title: "Lives Commerce",
        description: "Streaming Mux profissional com checkout em direto e tracking de engagement.",
        icon: Megaphone,
      },
      {
        title: "Portal B2B",
        description: "Cliente B2B com preços contratados, aprovações, stock e renovações.",
        icon: Shield,
      },
      {
        title: "Checkout & Recovery",
        description: "Checkout otimizado, A/B tests, recuperação de carrinho e bundles.",
        icon: Receipt,
      },
      {
        title: "Affiliates & FastClub",
        description: "Programa de afiliados, comissões e comunidade premium.",
        icon: Users,
      },
    ],
  },
];

export function getPillar(slug: string): ModulePillar | undefined {
  return PILLARS.find((p) => p.slug === slug);
}
