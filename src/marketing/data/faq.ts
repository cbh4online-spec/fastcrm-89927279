/**
 * FAQ factual do site público.
 * Fonte única usada nas páginas de marketing (texto visível) e no JSON-LD FAQPage.
 * Manter alinhado com public/llm.txt, public/llms.txt e public/llm.html.
 */
export interface MarketingFaqItem {
  question: string;
  answer: string;
}

export const MARKETING_FAQ: MarketingFaqItem[] = [
  {
    question: "O que é o FastCRM?",
    answer:
      "O FastCRM é um CRM com IA para PME e equipas de vendas em Portugal. Junta pipeline comercial, AI SDR, comunicações multicanal (WhatsApp, email, SMS e voz), faturação, cobranças, loja online e analítica numa única plataforma.",
  },
  {
    question: "Quanto custa o FastCRM?",
    answer:
      "A partir de 39 €/utilizador/mês no plano Start (até 3 utilizadores). O Grow custa 79 €/utilizador/mês (até 10 utilizadores) e o Pro 149 €/utilizador/mês com utilizadores ilimitados. Existe ainda um plano Enterprise sob consulta.",
  },
  {
    question: "É possível experimentar antes de comprar?",
    answer:
      "Sim. Pode marcar uma demonstração gratuita de 30 minutos na página de contacto e ver o FastCRM aplicado ao seu caso real.",
  },
  {
    question: "O FastCRM funciona no telemóvel?",
    answer:
      "Sim. É uma Progressive Web App instalável em Android e iOS, com notificações push e funcionamento otimizado para uso no terreno.",
  },
  {
    question: "O FastCRM liga-se ao WhatsApp?",
    answer:
      "Sim. Suporta WhatsApp via Evolution API (ligação por QR Code e webhooks bidirecionais) e também através da integração com o GoHighLevel, com registo automático das mensagens e chamadas na ficha do cliente.",
  },
  {
    question: "O FastCRM emite faturas em Portugal?",
    answer:
      "Sim. Inclui faturação, recibos, contratos recorrentes, importação de ficheiros SAF-T e integração com o e-Fatura, além de um módulo de cobranças com aging e DSO.",
  },
  {
    question: "Que IA está incluída?",
    answer:
      "Assistentes conversacionais, AI SDR para prospeção outbound, scoring preditivo de negócios e preenchimento automático de dados. Cada plano inclui créditos de IA mensais, sem necessidade de chaves de API próprias.",
  },
  {
    question: "O FastCRM cumpre o RGPD?",
    answer:
      "Sim. Os dados de cada organização estão isolados por workspace com Row Level Security, e a plataforma inclui auditoria de operações, gestão de consentimentos e direito ao esquecimento.",
  },
];
