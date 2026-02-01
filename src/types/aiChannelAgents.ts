/**
 * AI Channel Agents - Multi-Platform Agent System
 * 
 * Defines agents for different communication channels (WhatsApp, Instagram, Widget, etc.)
 * Each agent has its own persona and knowledge base configuration.
 */

// =============================================================================
// CHANNEL TYPES
// =============================================================================

export type AgentChannel = 
  | 'widget' 
  | 'whatsapp' 
  | 'instagram' 
  | 'facebook' 
  | 'email' 
  | 'sms'
  | 'live_chat';

export interface ChannelConfig {
  id: AgentChannel;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
}

export const AGENT_CHANNELS: Record<AgentChannel, ChannelConfig> = {
  widget: {
    id: 'widget',
    label: 'Widget',
    icon: 'MessageCircle',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    description: 'Chat widget embebido no site'
  },
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'Phone',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Mensagens via WhatsApp Business'
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    icon: 'Instagram',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    description: 'DMs do Instagram'
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    icon: 'Facebook',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Messenger do Facebook'
  },
  email: {
    id: 'email',
    label: 'Email',
    icon: 'Mail',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Respostas automáticas por email'
  },
  sms: {
    id: 'sms',
    label: 'SMS',
    icon: 'MessageSquare',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    description: 'Mensagens SMS'
  },
  live_chat: {
    id: 'live_chat',
    label: 'Live Chat',
    icon: 'Headphones',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Chat ao vivo com suporte'
  }
};

// =============================================================================
// AI CHANNEL AGENT
// =============================================================================

export interface AIChannelAgent {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  channel: AgentChannel;
  personaId: string | null;
  knowledgeBaseIds: string[];
  flowId: string | null;
  isActive: boolean;
  priority: number;
  settings: AIAgentSettings;
  createdAt: string;
  updatedAt: string;
  
  // Joined data (optional)
  persona?: {
    id: string;
    name: string;
    toneOfVoice: string;
  };
  knowledgeBases?: Array<{
    id: string;
    name: string;
  }>;
  flow?: {
    id: string;
    name: string;
  };
}

export interface AIAgentSettings {
  // Response behavior
  responseDelayMs?: number;
  typingIndicator?: boolean;
  
  // Limits
  maxMessagesPerHour?: number;
  maxMessagesPerConversation?: number;
  
  // Working hours
  respectWorkingHours?: boolean;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[];
  timezone?: string;
  
  // Handoff
  autoHandoffEnabled?: boolean;
  handoffKeywords?: string[];
  
  // Channel-specific
  [key: string]: unknown;
}

// =============================================================================
// FORM DATA
// =============================================================================

export interface CreateAIAgentData {
  name: string;
  description?: string;
  channel: AgentChannel;
  personaId?: string;
  knowledgeBaseIds?: string[];
  flowId?: string;
  isActive?: boolean;
  priority?: number;
  settings?: AIAgentSettings;
}

export interface UpdateAIAgentData extends Partial<CreateAIAgentData> {
  id: string;
}

// =============================================================================
// HELPERS
// =============================================================================

export function getChannelConfig(channel: AgentChannel): ChannelConfig {
  return AGENT_CHANNELS[channel];
}

export function isValidChannel(channel: string): channel is AgentChannel {
  return Object.keys(AGENT_CHANNELS).includes(channel);
}

export function getChannelIcon(channel: AgentChannel): string {
  return AGENT_CHANNELS[channel]?.icon || 'MessageCircle';
}

export function getChannelColor(channel: AgentChannel): string {
  return AGENT_CHANNELS[channel]?.color || 'text-gray-600';
}

export function getChannelBgColor(channel: AgentChannel): string {
  return AGENT_CHANNELS[channel]?.bgColor || 'bg-gray-100';
}
