/**
 * Conversational intent detection — classifies user messages as
 * 'conversational' (greetings, help requests) vs 'business_query'.
 * Conversational messages are handled locally without calling ask-fastcrm.
 */

export type IntentType = 'conversational' | 'business_query';
export type ConversationalSubtype = 'greeting' | 'help' | 'status' | 'identity';

interface IntentResult {
  type: IntentType;
  subtype?: ConversationalSubtype;
}

const PATTERNS: { pattern: RegExp; subtype: ConversationalSubtype }[] = [
  // Greetings
  { pattern: /^ol[aá]\s*[!,.]*/i, subtype: 'greeting' },
  { pattern: /^bom dia/i, subtype: 'greeting' },
  { pattern: /^boa tarde/i, subtype: 'greeting' },
  { pattern: /^boa noite/i, subtype: 'greeting' },
  { pattern: /^e a[ií]/i, subtype: 'greeting' },
  { pattern: /^hey\b/i, subtype: 'greeting' },
  { pattern: /^hi\b/i, subtype: 'greeting' },
  { pattern: /^hello\b/i, subtype: 'greeting' },
  // Status check
  { pattern: /^tudo bem/i, subtype: 'status' },
  { pattern: /^como (est[aá]s|est[aá]|vais)/i, subtype: 'status' },
  // Help
  { pattern: /^o que (podes|consegues|sabes) fazer/i, subtype: 'help' },
  { pattern: /^ajuda\s*$/i, subtype: 'help' },
  { pattern: /^help\s*$/i, subtype: 'help' },
  // Identity
  { pattern: /^quem [eé]s/i, subtype: 'identity' },
  { pattern: /^apresenta-te/i, subtype: 'identity' },
  { pattern: /^o que [eé]s/i, subtype: 'identity' },
];

export function detectIntent(message: string): IntentResult {
  const trimmed = message.trim();
  
  for (const { pattern, subtype } of PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'conversational', subtype };
    }
  }
  
  return { type: 'business_query' };
}

export interface ConversationalResponse {
  text: string;
  suggestions: string[];
}

export function getConversationalResponse(
  subtype: ConversationalSubtype,
  userName?: string,
  stats?: { leads?: number; opportunities?: number; decisions?: number }
): ConversationalResponse {
  const name = userName?.split(' ')[0] || 'there';
  
  switch (subtype) {
    case 'greeting':
      return {
        text: `Olá, ${name}! 👋\n\nEstou aqui para te ajudar a gerir o negócio.\nPodes perguntar-me coisas como:\n\n• "Quais os leads sem resposta esta semana?"\n• "Como está o pipeline?"\n• "Qual a receita prevista para este mês?"\n• "Que decisões estão pendentes?"\n\nOu escreve **/** para ver todos os comandos disponíveis.`,
        suggestions: [
          'Como está o pipeline?',
          'Leads sem resposta',
          '/brief',
        ],
      };
    
    case 'help':
    case 'identity':
      return {
        text: `Posso responder a perguntas sobre o teu negócio em linguagem natural.\n\nPor exemplo:\n• **/brief** → Resumo executivo do dia\n• **/leads** → Estado dos leads activos\n• **/pipeline** → Análise do pipeline\n• **/forecast** → Previsão de receita\n• **/drift** → Contexto desactualizado\n• **/tarefas** → Tarefas de hoje\n\nOu faz qualquer pergunta directamente — *"quem são os meus leads mais quentes?"*`,
        suggestions: [
          '/brief',
          '/pipeline',
          'Leads mais quentes',
        ],
      };
    
    case 'status': {
      const leadCount = stats?.leads ?? 0;
      const oppCount = stats?.opportunities ?? 0;
      const decCount = stats?.decisions ?? 0;
      
      // All zeros — onboarding message
      if (leadCount === 0 && oppCount === 0 && decCount === 0) {
        return {
          text: `Estou a funcionar bem! 🚀\n\nParece que ainda estás a configurar o workspace.\n\nPara começar, podes:\n• Importar os teus leads existentes\n• Criar a primeira oportunidade no pipeline\n• Ou perguntar-me qualquer coisa sobre o sistema`,
          suggestions: [
            '/brief',
            'Como funciona o pipeline?',
            'Importar leads',
          ],
        };
      }
      
      // Show only non-zero values
      const parts: string[] = [];
      if (leadCount > 0) parts.push(`**${leadCount} leads activos**`);
      if (oppCount > 0) parts.push(`**${oppCount} oportunidades abertas**`);
      if (decCount > 0) parts.push(`**${decCount} decisões pendentes do Kernel**`);
      
      const statusText = parts.length > 0
        ? `O teu workspace tem ${parts.join(', ')}.\n\nQueres saber mais sobre algum destes?`
        : 'Tudo em ordem por aqui! ✨';
      
      return {
        text: `Estou a funcionar bem! 🚀\n\n${statusText}`,
        suggestions: [
          ...(leadCount > 0 ? ['Ver leads activos'] : []),
          ...(oppCount > 0 ? ['Pipeline aberto'] : []),
          ...(decCount > 0 ? ['Decisões pendentes'] : []),
          '/brief',
        ].slice(0, 3),
      };
    }
    
    default:
      return {
        text: `Estou aqui para ajudar! Faz qualquer pergunta sobre o teu negócio.`,
        suggestions: ['Como está o pipeline?', '/brief'],
      };
  }
}
