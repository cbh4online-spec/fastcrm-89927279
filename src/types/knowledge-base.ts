// Knowledge Base & AI Specialist Module Types

export type KnowledgeBaseType = 
  | 'general'
  | 'atendimento'
  | 'vendas'
  | 'formacao'
  | 'consultoria'
  | 'saude'
  | 'produto'
  | 'interna';

export type SourceType = 'url' | 'document' | 'manual' | 'faq';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type EntryStatus = 'draft' | 'validated' | 'archived';

export type EntryType = 'faq' | 'article' | 'document' | 'procedure' | 'script' | 'link';

export type PersonaType = 'atendimento' | 'comercial' | 'formador' | 'terapeuta' | 'suporte';

export type ToneOfVoice = 'empático' | 'direto' | 'educativo' | 'técnico';

export type TechnicalDepth = 'low' | 'medium' | 'high';

export type LanguageStyle = 'formal' | 'conversational' | 'casual';

export type ContentVisibility = 'internal' | 'external';

export type KnowledgeContext = 'atendimento' | 'vendas' | 'suporte' | 'formacao' | 'saude' | 'geral';

export interface KnowledgeBase {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: KnowledgeBaseType;
  isActive: boolean;
  allowedChannels: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Computed
  sourcesCount?: number;
  entriesCount?: number;
  validatedEntriesCount?: number;
}

export interface KnowledgeSource {
  id: string;
  knowledgeBaseId: string;
  workspaceId: string;
  sourceType: SourceType;
  sourceUrl?: string;
  sourceFilePath?: string;
  originalContent?: string;
  processedContent?: string;
  extractedTopics?: string[];
  processingStatus: ProcessingStatus;
  processingError?: string;
  lastProcessedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeEntry {
  id: string;
  knowledgeBaseId: string;
  sourceId?: string;
  workspaceId: string;
  entryType: EntryType;
  title: string;
  question?: string;
  content: string;
  summary?: string;
  keywords?: string[];
  category?: string;
  context?: KnowledgeContext;
  visibility?: ContentVisibility;
  responsibleId?: string;
  internalNotes?: string;
  status: EntryStatus;
  validatedBy?: string;
  validatedAt?: string;
  expiresAt?: string;
  usageCount: number;
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIPersona {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  personaType: PersonaType;
  toneOfVoice: ToneOfVoice;
  technicalDepth: TechnicalDepth;
  languageStyle: LanguageStyle;
  systemPrompt?: string;
  limitations?: string[];
  knowledgeBaseIds?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeUsageLog {
  id: string;
  workspaceId: string;
  knowledgeBaseId?: string;
  entryId?: string;
  personaId?: string;
  context: string;
  query: string;
  response?: string;
  responseSource: 'knowledge_base' | 'fallback' | 'human';
  confidenceScore?: number;
  wasHelpful?: boolean;
  feedback?: string;
  resultedInConversion?: boolean;
  resultedInMeeting?: boolean;
  responseTimeMs?: number;
  createdAt: string;
}

export interface FAQSuggestion {
  id: string;
  workspaceId: string;
  knowledgeBaseId?: string;
  question: string;
  suggestedAnswer?: string;
  frequency: number;
  sourceQueries?: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface KnowledgeMetrics {
  totalBases: number;
  totalEntries: number;
  validatedEntries: number;
  draftEntries: number;
  totalQueries: number;
  aiResolvedQueries: number;
  fallbackQueries: number;
  avgResponseTimeMs: number;
  conversionsAssisted: number;
  meetingsBooked: number;
  pendingFAQSuggestions: number;
  topUsedEntries: { id: string; title: string; usageCount: number }[];
  missingContentQueries: number;
}

export interface AIResponse {
  response: string;
  confidence: number;
  sourceEntries: string[];
  needsHumanReview: boolean;
  suggestedActions?: string[];
}

export const KNOWLEDGE_BASE_TYPES: Record<KnowledgeBaseType, { label: string; icon: string; description: string }> = {
  general: { label: 'Geral', icon: 'BookOpen', description: 'Conhecimento geral' },
  atendimento: { label: 'Atendimento & Suporte', icon: 'Headphones', description: 'FAQs e suporte ao cliente' },
  vendas: { label: 'Vendas & Fecho', icon: 'TrendingUp', description: 'Scripts e objeções' },
  formacao: { label: 'Formação & Educação', icon: 'GraduationCap', description: 'Materiais educativos' },
  consultoria: { label: 'Consultoria / Coaching', icon: 'Users', description: 'Metodologias e processos' },
  saude: { label: 'Saúde / Clínica', icon: 'Heart', description: 'Protocolos e procedimentos' },
  produto: { label: 'Produto / Serviço', icon: 'Package', description: 'Informação de produtos' },
  interna: { label: 'Interna (Equipa)', icon: 'Lock', description: 'Documentação interna' }
};

export const ENTRY_TYPE_CONFIG: Record<EntryType, { label: string; icon: string; description: string }> = {
  faq: { label: 'FAQ', icon: 'HelpCircle', description: 'Perguntas frequentes' },
  article: { label: 'Artigo', icon: 'FileText', description: 'Conteúdo informativo' },
  document: { label: 'Documento', icon: 'File', description: 'Documentação técnica' },
  procedure: { label: 'Procedimento', icon: 'ClipboardList', description: 'Passos e instruções' },
  script: { label: 'Script', icon: 'MessageSquare', description: 'Guiões de comunicação' },
  link: { label: 'Link Externo', icon: 'ExternalLink', description: 'Referência externa' }
};

export const CONTEXT_CONFIG: Record<KnowledgeContext, { label: string; icon: string; color: string }> = {
  atendimento: { label: 'Atendimento', icon: 'Headphones', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  vendas: { label: 'Vendas', icon: 'TrendingUp', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  suporte: { label: 'Suporte', icon: 'Wrench', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  formacao: { label: 'Formação', icon: 'GraduationCap', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  saude: { label: 'Saúde', icon: 'Heart', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  geral: { label: 'Geral', icon: 'Globe', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
};

export const PERSONA_TYPES: Record<PersonaType, { label: string; icon: string; defaultPrompt: string }> = {
  atendimento: {
    label: 'Especialista em Atendimento',
    icon: 'Headphones',
    defaultPrompt: 'És um especialista em atendimento ao cliente. Respondes de forma empática, clara e sempre focada em resolver o problema do cliente.'
  },
  comercial: {
    label: 'Consultor Comercial',
    icon: 'Briefcase',
    defaultPrompt: 'És um consultor comercial experiente. Ajudas a identificar necessidades e apresentas soluções de forma clara, focando nos benefícios para o cliente.'
  },
  formador: {
    label: 'Formador',
    icon: 'GraduationCap',
    defaultPrompt: 'És um formador paciente e didático. Explicas conceitos de forma clara, usas exemplos práticos e confirmas a compreensão.'
  },
  terapeuta: {
    label: 'Terapeuta / Coach',
    icon: 'Heart',
    defaultPrompt: 'És um profissional de saúde empático. Ouves com atenção, fazes perguntas clarificadoras e orientas de forma cuidadosa e respeitosa.'
  },
  suporte: {
    label: 'Suporte Técnico',
    icon: 'Wrench',
    defaultPrompt: 'És um especialista em suporte técnico. Resolves problemas de forma metódica, dás instruções claras passo-a-passo e confirmas a resolução.'
  }
};

export const TONE_OPTIONS: Record<ToneOfVoice, string> = {
  'empático': 'Empático e acolhedor',
  'direto': 'Direto e objetivo',
  'educativo': 'Educativo e explicativo',
  'técnico': 'Técnico e preciso'
};

export const ENTRY_STATUS_CONFIG: Record<EntryStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  draft: { label: 'Rascunho', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: 'Edit' },
  validated: { label: 'Validado', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: 'CheckCircle2' },
  archived: { label: 'Arquivado', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: 'Archive' }
};

export const VISIBILITY_CONFIG: Record<ContentVisibility, { label: string; icon: string }> = {
  internal: { label: 'Interno', icon: 'Lock' },
  external: { label: 'Externo', icon: 'Globe' }
};
