import { CommandResponse, CommandFollowUp } from "@/hooks/useCommandOrchestrator";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CommandFollowUpChipsProps {
  response: CommandResponse;
  onSelect: (command: string) => void;
  isLoading: boolean;
}

// Maps intent → contextual follow-up suggestions
const FOLLOW_UP_MAP: Record<string, { label: string; command: string; emoji: string }[]> = {
  "prepare-meeting": [
    { label: "Analisar objeções prováveis", emoji: "🛡️", command: "Quais são as objeções prováveis deste cliente e como respondê-las?" },
    { label: "Enviar agenda", emoji: "📧", command: "Gera um draft de email com a agenda da reunião" },
    { label: "Ver histórico do deal", emoji: "📊", command: "Mostra o histórico completo de interações com este deal" },
    { label: "Preparar proposta", emoji: "📝", command: "Gerar Proposta" },
  ],
  "analyze-company": [
    { label: "Criar oportunidade", emoji: "💼", command: "Como posso criar uma oportunidade com esta empresa?" },
    { label: "Contactos-chave", emoji: "👤", command: "Quais são os decisores e contactos-chave desta empresa?" },
    { label: "Preparar abordagem", emoji: "🎯", command: "Prepara uma estratégia de abordagem para esta empresa" },
  ],
  "analyze-deal": [
    { label: "Plano de resgate", emoji: "🚑", command: "Cria um plano de resgate para este deal" },
    { label: "Calcular risco", emoji: "⚠️", command: "Qual o risco real de perder este deal?" },
    { label: "Próximos passos", emoji: "▶️", command: "Quais devem ser os próximos passos para avançar este deal?" },
  ],
  "win-deal": [
    { label: "Draft de proposta", emoji: "📝", command: "Gerar Proposta" },
    { label: "Negociação pricing", emoji: "💰", command: "Estratégia de negociação de preço para este deal" },
    { label: "Agendar fecho", emoji: "📅", command: "Preparar Reunião" },
  ],
  "send-followup": [
    { label: "Agendar lembrete", emoji: "⏰", command: "Criar tarefa de follow-up em 3 dias" },
    { label: "Analisar engagement", emoji: "📈", command: "Qual o nível de engagement deste contacto?" },
    { label: "Alternativa multicanal", emoji: "📱", command: "Sugere uma abordagem por outro canal para este contacto" },
  ],
  "generate-proposal": [
    { label: "Enviar proposta", emoji: "📧", command: "Gera um email para enviar a proposta" },
    { label: "Análise competitiva", emoji: "🏢", command: "Quais concorrentes podem estar neste deal?" },
    { label: "Follow-up proposta", emoji: "✉️", command: "Follow-up" },
  ],
  "pipeline-status": [
    { label: "Deals em risco", emoji: "🔴", command: "Quais deals estão em risco de churn esta semana?" },
    { label: "Forecast receita", emoji: "💹", command: "Mostra o forecast de receita para os próximos 30 dias" },
    { label: "Top oportunidades", emoji: "🏆", command: "Quais são as top 5 oportunidades por valor?" },
  ],
};

// Generic follow-ups for unknown intents
const GENERIC_FOLLOW_UPS = [
  { label: "Aprofundar análise", emoji: "🔍", command: "Podes dar mais detalhes sobre isso?" },
  { label: "Pipeline status", emoji: "🔄", command: "Mostra o status do pipeline" },
  { label: "Tarefas pendentes", emoji: "📋", command: "Quais são as minhas tarefas pendentes?" },
];

export function CommandFollowUpChips({ response, onSelect, isLoading }: CommandFollowUpChipsProps) {
  const followUps = FOLLOW_UP_MAP[response.intent] || GENERIC_FOLLOW_UPS;

  // If entity context exists, enhance commands with entity reference
  const enhancedFollowUps = followUps.map((f) => ({
    ...f,
    command: response.entity_name
      ? `${f.command} — ${response.entity_name}`
      : f.command,
  }));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Seguimento</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {enhancedFollowUps.map((f, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.3 + i * 0.05 }}
              onClick={() => onSelect(f.command)}
              disabled={isLoading}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all disabled:opacity-50"
            >
              <span>{f.emoji}</span>
              <span>{f.label}</span>
              <ArrowRight className="h-3 w-3 text-primary/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
