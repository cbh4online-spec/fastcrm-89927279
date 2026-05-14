import type {
  LeadChefLandingContent,
} from "@/hooks/leadchef/useLeadChefLandingContent";

/**
 * Preset oficial de conteúdos LeadChef — usado pelo botão
 * "Auto-preencher" no Centro LeadChef. Cobre Hero, Módulos,
 * Benefícios, Jornada, FAQs, CTAs e SEO.
 */
export const LEADCHEF_DEFAULT_CONTENT: Omit<LeadChefLandingContent, "workspace_id" | "is_canonical"> = {
  hero: {
    badge: "CRM para Consultoras Bimby",
    title: "Mais demonstrações.",
    highlight: "Mais vendas. Sem caos.",
    subtitle:
      "O LeadChef organiza os teus contactos, agenda, follow-ups e WhatsApp num só sítio — para venderes mais Bimby com menos esforço.",
    primaryCtaLabel: "Começar grátis",
    primaryCtaHref: "/leadchef/precos",
    secondaryCtaLabel: "Ver preços",
    secondaryCtaHref: "/leadchef/precos",
    microCopy: "Sem cartão de crédito · Cancela quando quiseres",
  },

  modules: [
    {
      title: "Pipeline de Leads",
      desc: "Vê de relance quem está pronto a marcar demo e quem precisa de follow-up. Nada cai por terra.",
    },
    {
      title: "Agenda inteligente",
      desc: "Marca demos, visitas pós-venda e recrutamentos com lembretes automáticos para ti e para o cliente.",
    },
    {
      title: "WhatsApp integrado",
      desc: "Envia mensagens com 1 clique a partir de templates personalizados. Histórico fica guardado por contacto.",
    },
    {
      title: "Calculadora de poupança",
      desc: "Mostra ao cliente quanto poupa por mês com a Bimby. Mensagem pronta a enviar.",
    },
    {
      title: "Objetivos do mês",
      desc: "Define metas de vendas e demos. Acompanha o progresso em tempo real no painel Hoje.",
    },
    {
      title: "Equipa & comissões",
      desc: "Acompanha o desempenho da tua equipa e calcula automaticamente comissões e bónus.",
    },
  ],

  benefits: [
    { value: "+38%", label: "vendas no 1º trimestre" },
    { value: "−72%", label: "tempo gasto em admin" },
    { value: "100%", label: "follow-ups feitos a tempo" },
    { value: "5 min", label: "para configurar a app" },
  ],

  journey: [
    {
      step: "1",
      title: "Importas os teus contactos",
      desc: "Em segundos, todos os teus leads ficam organizados por estado.",
    },
    {
      step: "2",
      title: "Marcas e fazes a demo",
      desc: "A agenda envia lembretes automáticos. Tu chegas e brilhas.",
    },
    {
      step: "3",
      title: "Envias a poupança no WhatsApp",
      desc: "A calculadora gera a mensagem com os números do cliente.",
    },
    {
      step: "4",
      title: "Fechas a venda e cresces",
      desc: "Vês objetivos, comissões e novos leads num único painel.",
    },
  ],

  faqs: [
    {
      q: "Preciso de saber mexer em CRMs?",
      a: "Não. O LeadChef foi feito para Consultoras Bimby — interface simples, em português, com tudo onde devia estar.",
    },
    {
      q: "Funciona no telemóvel?",
      a: "Sim. É 100% mobile-first. Usas no telemóvel entre demonstrações, sem instalar nada.",
    },
    {
      q: "Os meus contactos ficam seguros?",
      a: "Sim. Os dados são teus, encriptados e cumprem o RGPD. Podes exportar ou apagar tudo a qualquer momento.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. Sem fidelizações. Cancelas dentro da app e o acesso fica até ao fim do período pago.",
    },
    {
      q: "O WhatsApp está incluído?",
      a: "A integração WhatsApp Business é um add-on opcional, com QR code da Evolution API. Mensagens manuais funcionam em todos os planos.",
    },
    {
      q: "Posso convidar a minha equipa?",
      a: "Sim. Os planos com mais de 50 clientes incluem gestão de equipa, comissões e relatórios partilhados.",
    },
  ],

  ctas: {
    scheduleHref: "/leadchef/precos",
    signupHref: "/auth?mode=signup&plan=leadchef",
    appHref: "/dashboard/leadchef/today",
    contactEmail: "leadchef@metodopare.ai",
    contactPhone: "+351 910 000 000",
  },

  seo: {
    title: "LeadChef — CRM para Consultoras Bimby | Mais vendas, menos caos",
    description:
      "O CRM feito para Consultoras Bimby: agenda, leads, WhatsApp, objetivos e comissões num só sítio. Começa grátis hoje.",
    ogTitle: "LeadChef — Vende mais Bimby com menos esforço",
    ogDescription:
      "Organiza leads, demos e follow-ups num CRM mobile-first feito para Consultoras Bimby.",
    canonical: "https://fastcrm.metodopare.ai/leadchef",
  },

  images: {
    logoUrl: "",
    heroImage: "",
    ogImage: "",
  },
};
