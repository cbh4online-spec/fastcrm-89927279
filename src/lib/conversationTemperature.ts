import { differenceInHours, differenceInMinutes } from "date-fns";

export type TemperatureState = "cold" | "warm" | "hot";

export interface TemperatureResult {
  score: number;
  state: TemperatureState;
  factors: TemperatureFactor[];
}

export interface TemperatureFactor {
  name: string;
  value: number;
  maxValue: number;
  description: string;
}

// Buying intent keywords (Portuguese and English)
const BUYING_KEYWORDS = [
  // Portuguese
  "preço", "valor", "custo", "orçamento", "proposta", "comprar", "adquirir",
  "contratar", "fechar", "negócio", "pagamento", "fatura", "investimento",
  "quanto custa", "como funciona", "disponibilidade", "prazo", "entrega",
  "desconto", "promoção", "oferta", "interesse", "quero", "preciso",
  // English
  "price", "cost", "quote", "proposal", "buy", "purchase", "interested",
  "how much", "payment", "invoice", "deal", "discount", "offer", "need"
];

interface ConversationData {
  messages?: Array<{
    direction: string;
    sent_at: string;
    content: string;
  }>;
  last_message_at?: string | null;
  created_at: string;
  unread_count: number;
  ai_intent?: string | null;
  user_intent?: string | null;
  lead?: {
    status?: string;
  } | null;
  opportunities?: Array<{
    status: string;
    value?: number | null;
  }>;
  // Proposal interaction tracking
  proposal_views?: number;
  proposal_replies?: number;
}

export function calculateTemperature(conv: ConversationData): TemperatureResult {
  const factors: TemperatureFactor[] = [];
  let totalScore = 0;

  // Factor 1: Message Frequency (max 25 points)
  const messageFrequencyScore = calculateMessageFrequency(conv, factors);
  totalScore += messageFrequencyScore;

  // Factor 2: Response Speed (max 25 points)
  const responseSpeedScore = calculateResponseSpeed(conv, factors);
  totalScore += responseSpeedScore;

  // Factor 3: Buying Keywords/Intent (max 25 points)
  const buyingIntentScore = calculateBuyingIntent(conv, factors);
  totalScore += buyingIntentScore;

  // Factor 4: Proposal/Opportunity Engagement (max 25 points)
  const engagementScore = calculateEngagement(conv, factors);
  totalScore += engagementScore;

  // Ensure score is between 0 and 100
  const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  return {
    score: finalScore,
    state: getTemperatureState(finalScore),
    factors,
  };
}

function calculateMessageFrequency(conv: ConversationData, factors: TemperatureFactor[]): number {
  const messages = conv.messages || [];
  const messageCount = messages.length;
  
  // Score based on message count in recent period
  // More messages = more engaged = higher temperature
  let score = 0;
  
  if (messageCount >= 20) score = 25;
  else if (messageCount >= 10) score = 20;
  else if (messageCount >= 5) score = 15;
  else if (messageCount >= 3) score = 10;
  else if (messageCount >= 1) score = 5;

  // Bonus for recent activity
  if (conv.last_message_at) {
    const hoursSinceLastMessage = differenceInHours(new Date(), new Date(conv.last_message_at));
    if (hoursSinceLastMessage < 1) score = Math.min(25, score + 5);
    else if (hoursSinceLastMessage < 6) score = Math.min(25, score + 3);
    else if (hoursSinceLastMessage > 72) score = Math.max(0, score - 10);
  }

  factors.push({
    name: "Frequência de mensagens",
    value: score,
    maxValue: 25,
    description: `${messageCount} mensagens na conversa`,
  });

  return score;
}

function calculateResponseSpeed(conv: ConversationData, factors: TemperatureFactor[]): number {
  const messages = conv.messages || [];
  if (messages.length < 2) {
    factors.push({
      name: "Velocidade de resposta",
      value: 0,
      maxValue: 25,
      description: "Dados insuficientes",
    });
    return 0;
  }

  // Calculate average response time from inbound messages
  let totalResponseTime = 0;
  let responseCount = 0;

  for (let i = 1; i < messages.length; i++) {
    const current = messages[i];
    const previous = messages[i - 1];
    
    // Check if this is an inbound message following an outbound
    if (current.direction === "inbound" && previous.direction === "outbound") {
      const responseMinutes = differenceInMinutes(
        new Date(current.sent_at),
        new Date(previous.sent_at)
      );
      if (responseMinutes > 0 && responseMinutes < 1440) { // Within 24 hours
        totalResponseTime += responseMinutes;
        responseCount++;
      }
    }
  }

  let score = 0;
  if (responseCount > 0) {
    const avgResponseMinutes = totalResponseTime / responseCount;
    
    // Fast responses = higher temperature
    if (avgResponseMinutes < 5) score = 25;
    else if (avgResponseMinutes < 30) score = 20;
    else if (avgResponseMinutes < 60) score = 15;
    else if (avgResponseMinutes < 180) score = 10;
    else if (avgResponseMinutes < 360) score = 5;
    
    factors.push({
      name: "Velocidade de resposta",
      value: score,
      maxValue: 25,
      description: `Resposta média: ${Math.round(avgResponseMinutes)} min`,
    });
  } else {
    // Check if there are unread messages (waiting for our response)
    if (conv.unread_count > 0) {
      score = 15; // Client is waiting, shows engagement
      factors.push({
        name: "Velocidade de resposta",
        value: score,
        maxValue: 25,
        description: "Aguardando nossa resposta",
      });
    } else {
      factors.push({
        name: "Velocidade de resposta",
        value: 0,
        maxValue: 25,
        description: "Sem respostas recentes",
      });
    }
  }

  return score;
}

function calculateBuyingIntent(conv: ConversationData, factors: TemperatureFactor[]): number {
  let score = 0;
  const messages = conv.messages || [];
  
  // Check AI/user intent classification
  const effectiveIntent = conv.user_intent || conv.ai_intent;
  if (effectiveIntent === "sales") {
    score += 15;
  }

  // Check for buying keywords in messages
  let keywordCount = 0;
  for (const msg of messages) {
    if (msg.direction === "inbound") {
      const contentLower = msg.content.toLowerCase();
      for (const keyword of BUYING_KEYWORDS) {
        if (contentLower.includes(keyword)) {
          keywordCount++;
          break; // Count once per message
        }
      }
    }
  }

  // Add points for keyword matches
  if (keywordCount >= 5) score += 10;
  else if (keywordCount >= 3) score += 7;
  else if (keywordCount >= 1) score += 4;

  // Cap at 25
  score = Math.min(25, score);

  const description = effectiveIntent === "sales" 
    ? `Intenção de compra (${keywordCount} msgs com keywords)`
    : keywordCount > 0 
      ? `${keywordCount} msgs com keywords de compra`
      : "Sem sinais de compra";

  factors.push({
    name: "Intenção de compra",
    value: score,
    maxValue: 25,
    description,
  });

  return score;
}

function calculateEngagement(conv: ConversationData, factors: TemperatureFactor[]): number {
  let score = 0;

  // Check for open opportunities
  const openOpportunities = conv.opportunities?.filter(o => o.status === "open") || [];
  if (openOpportunities.length > 0) {
    score += 15;
    
    // Bonus for high-value opportunities
    const totalValue = openOpportunities.reduce((sum, o) => sum + (o.value || 0), 0);
    if (totalValue > 10000) score += 5;
    else if (totalValue > 1000) score += 3;
  }

  // Check lead status
  const leadStatus = conv.lead?.status;
  if (leadStatus === "proposal") score += 7;
  else if (leadStatus === "qualified") score += 5;
  else if (leadStatus === "client") score += 10;

  // Proposal interactions
  const proposalViews = conv.proposal_views || 0;
  const proposalReplies = conv.proposal_replies || 0;
  if (proposalReplies > 0) score += 5;
  else if (proposalViews > 2) score += 3;
  else if (proposalViews > 0) score += 1;

  // Cap at 25
  score = Math.min(25, score);

  let description = "";
  if (openOpportunities.length > 0) {
    description = `${openOpportunities.length} oportunidade(s) aberta(s)`;
  } else if (leadStatus === "proposal") {
    description = "Proposta enviada";
  } else if (leadStatus === "qualified") {
    description = "Lead qualificado";
  } else if (leadStatus === "client") {
    description = "Cliente ativo";
  } else {
    description = "Sem oportunidades";
  }

  factors.push({
    name: "Engajamento comercial",
    value: score,
    maxValue: 25,
    description,
  });

  return score;
}

function getTemperatureState(score: number): TemperatureState {
  if (score <= 30) return "cold";
  if (score <= 60) return "warm";
  return "hot";
}

// Temperature display configuration
export const temperatureConfig: Record<TemperatureState, {
  label: string;
  color: string;
  bgColor: string;
  gradient: string;
  icon: string;
}> = {
  cold: {
    label: "Frio",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    gradient: "from-blue-500 to-blue-400",
    icon: "❄️",
  },
  warm: {
    label: "Morno",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    gradient: "from-amber-500 to-orange-400",
    icon: "🌡️",
  },
  hot: {
    label: "Quente",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    gradient: "from-red-500 to-orange-500",
    icon: "🔥",
  },
};
