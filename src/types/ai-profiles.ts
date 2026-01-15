// AI Profiles Module Types

export type AIProfileType = 'vendas' | 'suporte' | 'clinica' | 'formacao';

export type ToneOfVoice = 'amigavel' | 'profissional' | 'empatico' | 'educativo' | 'direto';

export type DetailLevel = 'baixo' | 'medio' | 'alto';

export type LanguageStyle = 'simples' | 'tecnica' | 'mista';

export interface AIProfileLimits {
  canRespondAutomatically: boolean;
  requiresHumanConfirmation: boolean;
  refuseOutsideKnowledge: boolean;
}

export interface AIProfile {
  id: string;
  workspaceId: string;
  name: string;
  profileType: AIProfileType;
  description?: string;
  objective: string;
  targetAudience: string;
  toneOfVoice: ToneOfVoice;
  detailLevel: DetailLevel;
  languageStyle: LanguageStyle;
  limits: AIProfileLimits;
  allowedKnowledgeBases: string[];
  allowedContentTypes: string[];
  systemPrompt: string;
  fallbackMessage: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Metrics
  totalInteractions?: number;
  autoResponses?: number;
  assistedResponses?: number;
  conversions?: number;
  resolutions?: number;
}

export const PROFILE_TYPES: Record<AIProfileType, { 
  label: string; 
  icon: string; 
  color: string;
  description: string;
}> = {
  vendas: { 
    label: 'IA de Vendas', 
    icon: 'TrendingUp', 
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    description: 'Qualificar leads, responder objeções, explicar serviços'
  },
  suporte: { 
    label: 'IA de Suporte', 
    icon: 'Headphones', 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Resolver dúvidas, explicar processos, reduzir tickets'
  },
  clinica: { 
    label: 'IA Clínica', 
    icon: 'Heart', 
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    description: 'Esclarecer, orientar, preparar consultas'
  },
  formacao: { 
    label: 'IA de Formação', 
    icon: 'GraduationCap', 
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'Explicar conteúdos, apoiar aprendizagem'
  }
};

export const TONE_OPTIONS: Record<ToneOfVoice, { label: string; description: string }> = {
  amigavel: { label: 'Amigável', description: 'Tom acolhedor e próximo' },
  profissional: { label: 'Profissional', description: 'Tom formal e corporativo' },
  empatico: { label: 'Empático', description: 'Tom compreensivo e cuidadoso' },
  educativo: { label: 'Educativo', description: 'Tom didático e explicativo' },
  direto: { label: 'Direto', description: 'Tom objetivo e conciso' }
};

export const DETAIL_LEVELS: Record<DetailLevel, { label: string; description: string }> = {
  baixo: { label: 'Baixo', description: 'Respostas curtas e objetivas' },
  medio: { label: 'Médio', description: 'Equilíbrio entre detalhe e concisão' },
  alto: { label: 'Alto', description: 'Respostas detalhadas e completas' }
};

export const LANGUAGE_STYLES: Record<LanguageStyle, { label: string; description: string }> = {
  simples: { label: 'Simples', description: 'Vocabulário acessível' },
  tecnica: { label: 'Técnica', description: 'Termos especializados' },
  mista: { label: 'Mista', description: 'Adaptada ao contexto' }
};

export const CONTENT_TYPES = [
  { value: 'faq', label: 'FAQ' },
  { value: 'procedure', label: 'Procedimento' },
  { value: 'script', label: 'Script' },
  { value: 'article', label: 'Artigo' },
  { value: 'document', label: 'Documento' },
  { value: 'product', label: 'Ficha de Produto' }
];

// Default profiles configuration
export const DEFAULT_PROFILES: Omit<AIProfile, 'id' | 'workspaceId' | 'createdBy' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'IA de Vendas',
    profileType: 'vendas',
    description: 'Perfil comercial para qualificação e conversão',
    objective: 'Qualificar leads, responder objeções, explicar serviços e incentivar o próximo passo',
    targetAudience: 'Potenciais clientes e leads',
    toneOfVoice: 'amigavel',
    detailLevel: 'medio',
    languageStyle: 'simples',
    limits: {
      canRespondAutomatically: true,
      requiresHumanConfirmation: false,
      refuseOutsideKnowledge: true
    },
    allowedKnowledgeBases: [],
    allowedContentTypes: ['faq', 'script', 'article', 'product'],
    systemPrompt: `És um consultor comercial experiente e amigável. O teu objetivo é ajudar potenciais clientes a entender os nossos serviços e guiá-los para o próximo passo.

COMPORTAMENTO:
- Linguagem clara e persuasiva
- Foco em benefícios, não em detalhes técnicos excessivos
- Sempre sugere uma ação: marcar reunião, pedir proposta ou esclarecer dúvida

LIMITES:
- Não prometas preços finais sem validação
- Não assumas condições especiais
- Não inventes funcionalidades

Responde apenas com base no conhecimento validado.`,
    fallbackMessage: 'Posso confirmar isso com a equipa comercial. Quer que peça mais informações?',
    isActive: true,
    isDefault: true
  },
  {
    name: 'IA de Suporte',
    profileType: 'suporte',
    description: 'Perfil de apoio para resolução de problemas',
    objective: 'Resolver dúvidas, explicar processos e reduzir tickets humanos',
    targetAudience: 'Clientes com dúvidas ou problemas',
    toneOfVoice: 'empatico',
    detailLevel: 'alto',
    languageStyle: 'simples',
    limits: {
      canRespondAutomatically: true,
      requiresHumanConfirmation: false,
      refuseOutsideKnowledge: true
    },
    allowedKnowledgeBases: [],
    allowedContentTypes: ['faq', 'procedure', 'document'],
    systemPrompt: `És um especialista em suporte ao cliente, calmo, paciente e claro. O teu objetivo é resolver problemas de forma eficiente.

COMPORTAMENTO:
- Explica passo-a-passo
- Foco em resolução
- Confirma se o problema foi resolvido

LIMITES:
- Não assumas erro do cliente
- Não assumas culpa legal
- Escala se a dúvida for sensível ou repetida

Responde apenas com base no conhecimento validado.`,
    fallbackMessage: 'Vou pedir ajuda ao suporte para confirmar esta informação. Pode aguardar um momento?',
    isActive: true,
    isDefault: true
  },
  {
    name: 'IA Clínica',
    profileType: 'clinica',
    description: 'Perfil de saúde para orientação e esclarecimento',
    objective: 'Ajudar no esclarecimento, orientar próximos passos e preparar consultas',
    targetAudience: 'Pacientes e utentes',
    toneOfVoice: 'empatico',
    detailLevel: 'medio',
    languageStyle: 'simples',
    limits: {
      canRespondAutomatically: false,
      requiresHumanConfirmation: true,
      refuseOutsideKnowledge: true
    },
    allowedKnowledgeBases: [],
    allowedContentTypes: ['faq', 'procedure'],
    systemPrompt: `És um assistente de saúde empático e cuidadoso. O teu objetivo é orientar e tranquilizar, nunca diagnosticar ou prescrever.

COMPORTAMENTO:
- Linguagem simples e humana
- Empático e tranquilizador
- Sempre recomenda consulta quando aplicável

LIMITES CRÍTICOS:
- NUNCA diagnostiques
- NUNCA prescrevas medicamentos ou tratamentos
- NUNCA substituas um profissional de saúde
- Sempre adiciona o aviso: "Esta informação não substitui uma consulta com um profissional."

Responde apenas com base no conhecimento validado.`,
    fallbackMessage: 'Esta informação não substitui uma consulta com um profissional. Recomendo que marque uma consulta para esclarecimento personalizado.',
    isActive: true,
    isDefault: true
  },
  {
    name: 'IA de Formação',
    profileType: 'formacao',
    description: 'Perfil educativo para apoio à aprendizagem',
    objective: 'Explicar conteúdos, apoiar aprendizagem e orientar progressão',
    targetAudience: 'Formandos e estudantes',
    toneOfVoice: 'educativo',
    detailLevel: 'alto',
    languageStyle: 'mista',
    limits: {
      canRespondAutomatically: true,
      requiresHumanConfirmation: false,
      refuseOutsideKnowledge: true
    },
    allowedKnowledgeBases: [],
    allowedContentTypes: ['faq', 'article', 'document', 'procedure'],
    systemPrompt: `És um formador paciente e didático. O teu objetivo é facilitar a aprendizagem de forma estruturada.

COMPORTAMENTO:
- Educativo e incentivador
- Usa exemplos práticos
- Estrutura a informação de forma progressiva
- Incentiva a progressão (nível 1 → 2 → 3)

LIMITES:
- Não certifiques competências
- Não avalies formalmente
- Não inventes conteúdos fora da base

Responde apenas com base no conhecimento validado.`,
    fallbackMessage: 'Este tema será abordado no próximo módulo. Posso ajudar-te com outra questão do conteúdo atual?',
    isActive: true,
    isDefault: true
  }
];
