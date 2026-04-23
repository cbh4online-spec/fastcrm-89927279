/**
 * Prova social, casos de sucesso e testemunhos para o site marketing.
 * Os números aqui devem ser ajustados pelo equipa de marketing antes de live.
 */

export interface CaseStudy {
  slug: string;
  company: string;
  sector: string;
  size: string;
  quote: string;
  author: string;
  authorRole: string;
  metrics: { label: string; value: string }[];
  story: string;
}

export const CASES: CaseStudy[] = [
  {
    slug: "imo-conecta",
    company: "ImoConecta",
    sector: "Imobiliário",
    size: "12 consultores",
    quote:
      "Em 90 dias dobrámos o número de visitas marcadas e reduzimos para metade o tempo de resposta a leads.",
    author: "Ricardo Almeida",
    authorRole: "Diretor Comercial",
    metrics: [
      { label: "Tempo de resposta", value: "-58%" },
      { label: "Visitas marcadas", value: "+112%" },
      { label: "Receita por consultor", value: "+34%" },
    ],
    story:
      "A ImoConecta operava com WhatsApp + Excel. Implementámos AI SDR, pipeline e automações de follow-up. Resultado: leads com resposta em < 5 min e ciclo de venda mais curto.",
  },
  {
    slug: "fit-academia",
    company: "Fit Academia",
    sector: "Ginásios & Bem-estar",
    size: "5 unidades",
    quote:
      "Finalmente temos visibilidade completa sobre quem cancela, quem renova e quem está à beira de churn — antes acontecer.",
    author: "Sofia Carvalho",
    authorRole: "CEO",
    metrics: [
      { label: "Churn mensal", value: "-22%" },
      { label: "Renovações automáticas", value: "94%" },
      { label: "MRR", value: "+€18k/mês" },
    ],
    story:
      "A Fit Academia integrou o módulo de Renovações + Risk Engine. Hoje o sistema avisa o gestor 14 dias antes do risco de cancelamento e dispara campanhas de retenção.",
  },
  {
    slug: "casa-do-norte",
    company: "Casa do Norte",
    sector: "Marketplace C2C",
    size: "320 vendedores",
    quote:
      "Saímos de um marketplace WordPress com 0 conversão para uma operação com lives semanais e checkout otimizado. Faturação 4x.",
    author: "Miguel Tavares",
    authorRole: "Founder",
    metrics: [
      { label: "GMV mensal", value: "+312%" },
      { label: "Conversão checkout", value: "8.4%" },
      { label: "Vendedores ativos", value: "320" },
    ],
    story:
      "Migrámos a Casa do Norte para o Marketplace C2C + Lives commerce. As lives semanais geram picos de €40k/sessão e o checkout otimizado triplicou a taxa de conversão.",
  },
];

export const TESTIMONIALS = [
  {
    quote: "Substituiu HubSpot, Mailchimp e a nossa loja Shopify. Pagamento simples e equipa unida.",
    author: "Ana Martins",
    role: "Marketing Director, Estética Plus",
  },
  {
    quote: "O AI SDR escreve follow-ups melhores que metade da minha equipa. E nunca esquece.",
    author: "João Pereira",
    role: "Sales Manager, Tech4U",
  },
  {
    quote: "Em 30 dias tínhamos pipeline organizado, faturação ligada e WhatsApp no mesmo sítio.",
    author: "Helena Cruz",
    role: "Founder, Cruz Consulting",
  },
  {
    quote: "Os relatórios em tempo real mudaram a forma como faço reuniões semanais. Fim do ‘achismo’.",
    author: "Pedro Santos",
    role: "COO, NorteServiços",
  },
];

export const LOGOS = [
  "ImoConecta", "Fit Academia", "Casa do Norte", "Estética Plus",
  "Tech4U", "Cruz Consulting", "NorteServiços", "Beauty Lab",
  "AutoStop", "EduPlus", "ProClean", "GoldGym",
];

export const STATS = [
  { value: "+800", label: "Equipas comerciais ativas" },
  { value: "€42M", label: "Receita gerida na plataforma" },
  { value: "4.8/5", label: "Satisfação dos clientes" },
  { value: "92%", label: "Renovação anual" },
];
