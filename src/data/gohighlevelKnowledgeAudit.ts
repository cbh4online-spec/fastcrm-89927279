export interface GoHighLevelKnowledgeBaseAudit {
  name: string;
  description: string;
  type: 'general' | 'atendimento' | 'vendas' | 'formacao' | 'consultoria' | 'saude' | 'produto' | 'interna';
  sourceCounts?: {
    links: number;
    faqs: number;
    richText: number;
    tables: number;
    files: number;
  };
}

export interface GoHighLevelKnowledgeGap {
  question: string;
  category: string;
  frequency: number;
}

export const GOHIGHLEVEL_AUDIT_DATE = '2026-08-31';

export const GOHIGHLEVEL_KNOWLEDGE_BASES: GoHighLevelKnowledgeBaseAudit[] = [
  {
    name: 'miMYA',
    description: 'Base geral migrada da subconta My Mia no GoHighLevel.',
    type: 'general',
  },
  {
    name: 'mymia_pricing_knowledge_base',
    description: 'Informação comercial e de preços migrada do GoHighLevel.',
    type: 'vendas',
  },
  {
    name: 'myMIA Demo Bot',
    description: 'Conhecimento usado pelo agente de demonstração no GoHighLevel.',
    type: 'formacao',
  },
  {
    name: 'myMIA Main Bot Knowledge Base',
    description: 'Base principal do agente myMIA no GoHighLevel. Auditoria: 3 ligações, 16 FAQs e 20 lacunas por responder.',
    type: 'atendimento',
    sourceCounts: { links: 3, faqs: 16, richText: 0, tables: 0, files: 0 },
  },
  {
    name: 'myMIA Technical Bot Knowledge Base',
    description: 'Conhecimento de suporte técnico migrado do GoHighLevel.',
    type: 'interna',
  },
];

export const GOHIGHLEVEL_KNOWLEDGE_GAPS: GoHighLevelKnowledgeGap[] = [
  { category: 'PDF Client Issues', frequency: 1, question: 'Como resolver problemas com os PDFs de clientes?' },
  { category: 'Contact Follow-up', frequency: 2, question: 'Qual é o estado do contacto prometido ao cliente, como escalar um seguimento em falta e quais são os contactos ou próximos passos corretos da equipa myMIA?' },
  { category: 'User Interface Issues', frequency: 1, question: 'Como resolver alterações da aplicação, problemas de usabilidade e duplicação de texto nos campos de escrita?' },
  { category: 'Service Planning', frequency: 1, question: 'Existe um relatório ou proposta de exemplo para planear o serviço de terapia capilar?' },
  { category: 'Personalized Data Display', frequency: 2, question: 'Existe um exemplo visual de uma ficha personalizada com o nome e o logótipo do cliente?' },
  { category: 'Contact & Service Details', frequency: 6, question: 'Como obter contactos e informação detalhada sobre serviços, incluindo preços e modelos de e-mail para consultores ou parcerias?' },
  { category: 'Login Access', frequency: 5, question: 'Quais são os requisitos da palavra-passe e o processo de primeiro acesso, ativação, alteração e recuperação da palavra-passe de uma conta myMIA?' },
  { category: 'Access Methods', frequency: 3, question: 'A myMIA exige a instalação de uma aplicação ou pode ser usada num navegador, e quais são os passos exatos de acesso?' },
  { category: 'Event Location', frequency: 4, question: 'Qual é a morada da masterclass myMIA de 27 de julho, na sessão das 15:00?' },
  { category: 'Integration Compatibility', frequency: 1, question: 'O DermaZoom é suportado diretamente pela myMIA ou apenas é possível carregar fotografias manualmente e gerar o relatório por IA? Quais são os passos de configuração?' },
  { category: 'Service Offerings', frequency: 1, question: 'Quais são as diferenças e benefícios entre avaliação e tratamento capilar, que serviços estão disponíveis e quais são os próximos passos recomendados?' },
  { category: 'Partnership Terms', frequency: 1, question: 'Como avaliar e responder a uma proposta de parceria digital com pacotes pagos de seguidores, incluindo legitimidade, políticas, aceitação, preços e condições?' },
  { category: 'Data Verification', frequency: 2, question: 'Os registos de “scalp dart” na anamnese baseiam-se apenas no relato do cliente ou têm de ser confirmados ao microscópio antes de guardar?' },
  { category: 'Order Tracking', frequency: 1, question: 'Como acompanhar a entrega de uma compra de Dino-Lite ou tricoscópio, incluindo previsão, dados de envio e apoio pós-venda?' },
  { category: 'Device Integration', frequency: 1, question: 'Como importar ou transferir imagens de um dispositivo ou software DermaZoom para a plataforma, incluindo formatos, passos, limitações, adaptadores e subscrições?' },
  { category: 'Post-Event Access', frequency: 2, question: 'Como entrar numa masterclass depois do início, obter o link da sessão em curso e aceder à gravação ou alternativa caso a sessão tenha sido perdida?' },
  { category: 'Access Information', frequency: 3, question: 'Uma sessão confirmada para as 15:00 em Portugal pode ser acompanhada a partir do Brasil? Qual é a hora local e quais são os dados de acesso?' },
  { category: 'Event Duration', frequency: 1, question: 'Qual é a duração habitual da demonstração online?' },
  { category: 'Attachment Management', frequency: 1, question: 'Como anexar fotografias a um registo e sair ou voltar ao formulário sem perder os anexos?' },
  { category: 'Contact Addresses', frequency: 2, question: 'A Ana, da equipa ou contacto myMIA, vive em Lisboa?' },
];
