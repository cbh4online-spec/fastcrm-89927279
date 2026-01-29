/**
 * Types for the AI Conversational Engine
 * Covers Vibe Profiles, Conversation Rules, Autopilot Config
 */

import { Database } from "@/integrations/supabase/types";

// ==========================================
// Vibe Profiles
// ==========================================

export type VibeProfile = Database["public"]["Tables"]["vibe_profiles"]["Row"];
export type VibeProfileInsert = Database["public"]["Tables"]["vibe_profiles"]["Insert"];
export type VibeProfileUpdate = Database["public"]["Tables"]["vibe_profiles"]["Update"];

export type VibeTone = "calm" | "energetic" | "warm" | "professional" | "friendly";
export type VibeFormality = "informal" | "neutral" | "formal";
export type VibeResponseLength = "very_concise" | "concise" | "moderate" | "detailed";
export type VibePersonality = "empathetic" | "direct" | "advisory" | "supportive";
export type VibeCommercialApproach = "non_commercial" | "soft_sell" | "value_focused";
export type VibePreferredStructure = "bullets" | "paragraphs" | "mixed";

export const VIBE_TONE_OPTIONS: Record<VibeTone, { label: string; description: string }> = {
  calm: { label: "Calmo", description: "Tom tranquilo e sereno" },
  energetic: { label: "Energético", description: "Tom dinâmico e entusiasmado" },
  warm: { label: "Acolhedor", description: "Tom caloroso e amigável" },
  professional: { label: "Profissional", description: "Tom corporativo e sério" },
  friendly: { label: "Simpático", description: "Tom descontraído e acessível" },
};

export const VIBE_FORMALITY_OPTIONS: Record<VibeFormality, { label: string; description: string }> = {
  informal: { label: "Informal", description: "Linguagem casual, tuteia" },
  neutral: { label: "Neutro", description: "Equilibrado entre formal e informal" },
  formal: { label: "Formal", description: "Linguagem formal, você/Senhor(a)" },
};

export const VIBE_RESPONSE_LENGTH_OPTIONS: Record<VibeResponseLength, { label: string; sentences: number }> = {
  very_concise: { label: "Muito Conciso", sentences: 1 },
  concise: { label: "Conciso", sentences: 3 },
  moderate: { label: "Moderado", sentences: 5 },
  detailed: { label: "Detalhado", sentences: 10 },
};

export const VIBE_PERSONALITY_OPTIONS: Record<VibePersonality, { label: string; description: string }> = {
  empathetic: { label: "Empático", description: "Foca nas emoções e compreensão" },
  direct: { label: "Direto", description: "Vai ao ponto, sem rodeios" },
  advisory: { label: "Consultivo", description: "Oferece orientação e sugestões" },
  supportive: { label: "Suporte", description: "Apoio e resolução de problemas" },
};

export const VIBE_COMMERCIAL_OPTIONS: Record<VibeCommercialApproach, { label: string; description: string }> = {
  non_commercial: { label: "Não Comercial", description: "Nunca menciona vendas ou promoções" },
  soft_sell: { label: "Venda Suave", description: "Menciona soluções quando relevante" },
  value_focused: { label: "Foco no Valor", description: "Destaca benefícios e valor agregado" },
};

// ==========================================
// Conversation Rules
// ==========================================

export type ConversationRule = Database["public"]["Tables"]["conversation_rules"]["Row"];
export type ConversationRuleInsert = Database["public"]["Tables"]["conversation_rules"]["Insert"];
export type ConversationRuleUpdate = Database["public"]["Tables"]["conversation_rules"]["Update"];

export type ConversationRuleType = "DO" | "DONT" | "STOP" | "REDIRECT";
export type ConversationRuleScope = "workspace" | "ai_persona" | "flow" | "channel";

export const RULE_TYPE_OPTIONS: Record<ConversationRuleType, { label: string; description: string; color: string }> = {
  DO: { label: "FAZER", description: "Ações que a IA DEVE executar", color: "bg-green-500" },
  DONT: { label: "NÃO FAZER", description: "Ações PROIBIDAS para a IA", color: "bg-red-500" },
  STOP: { label: "PARAR", description: "Condições que terminam a conversa ou escalam para humano", color: "bg-orange-500" },
  REDIRECT: { label: "REDIRECIONAR", description: "Redireciona para outro fluxo/persona", color: "bg-blue-500" },
};

export const RULE_SCOPE_OPTIONS: Record<ConversationRuleScope, { label: string; description: string }> = {
  workspace: { label: "Todo o Workspace", description: "Aplica-se a todas as conversas" },
  ai_persona: { label: "Persona", description: "Aplica-se a uma persona específica" },
  channel: { label: "Canal", description: "Aplica-se a um canal específico" },
  flow: { label: "Fluxo", description: "Aplica-se a um fluxo específico" },
};

export const CONDITION_TYPE_OPTIONS = [
  { value: "keyword", label: "Contém Palavra-Chave" },
  { value: "regex", label: "Expressão Regular" },
  { value: "intent", label: "Intenção Detectada" },
  { value: "sentiment", label: "Sentimento Negativo" },
  { value: "message_count", label: "Número de Mensagens" },
  { value: "time_elapsed", label: "Tempo Decorrido" },
  { value: "topic", label: "Tópico Específico" },
  { value: "always", label: "Sempre (sem condição)" },
];

export const ACTION_TYPE_OPTIONS = [
  { value: "respond_with", label: "Responder com Mensagem" },
  { value: "refuse", label: "Recusar Educadamente" },
  { value: "redirect_persona", label: "Redirecionar para Persona" },
  { value: "redirect_flow", label: "Redirecionar para Fluxo" },
  { value: "escalate_human", label: "Escalar para Humano" },
  { value: "end_conversation", label: "Terminar Conversa" },
  { value: "log_event", label: "Registar Evento" },
];

// ==========================================
// Autopilot Config
// ==========================================

export type AutopilotConfig = Database["public"]["Tables"]["autopilot_config"]["Row"];
export type AutopilotConfigInsert = Database["public"]["Tables"]["autopilot_config"]["Insert"];
export type AutopilotConfigUpdate = Database["public"]["Tables"]["autopilot_config"]["Update"];

export const WORKING_DAYS_OPTIONS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export const TIMEZONE_OPTIONS = [
  { value: "Europe/Lisbon", label: "Lisboa (WET/WEST)" },
  { value: "Europe/London", label: "Londres (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/New_York", label: "Nova Iorque (EST/EDT)" },
];

export const CONFIG_SCOPE_OPTIONS = [
  { value: "workspace", label: "Todo o Workspace" },
  { value: "channel", label: "Canal Específico" },
];
