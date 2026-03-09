import { Card, CardContent } from "@/components/ui/card";

interface SuggestionItem {
  key: string;
  label: string;
  emoji: string;
  desc: string;
}

const SUGGESTIONS: SuggestionItem[] = [
  { key: "prepare-meeting", label: "Preparar Reunião", emoji: "📅", desc: "Briefing completo com contexto da empresa, contactos e histórico de interações" },
  { key: "analyze-company", label: "Analisar Empresa", emoji: "🏢", desc: "Perfil da empresa, fit ICP, potencial de receita e histórico de deals" },
  { key: "analyze-deal", label: "Analisar Deal", emoji: "📊", desc: "Saúde do deal, progressão de estágio, engagement e sinais de risco" },
  { key: "win-deal", label: "Ganhar Deal", emoji: "🏆", desc: "Probabilidade de fecho, blockers, e estratégia de closing recomendada" },
  { key: "send-followup", label: "Follow-up", emoji: "✉️", desc: "Draft de mensagem, melhor timing, canal recomendado" },
  { key: "generate-proposal", label: "Gerar Proposta", emoji: "📝", desc: "Estrutura de proposta, value props e sugestões de pricing" },
  { key: "pipeline-status", label: "Pipeline Status", emoji: "🔄", desc: "Saúde do pipeline, distribuição por estágio, bottlenecks e forecast" },
];

interface CommandSuggestionGridProps {
  onSelect: (command: string) => void;
}

export function CommandSuggestionGrid({ onSelect }: CommandSuggestionGridProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comandos Disponíveis</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {SUGGESTIONS.map((s) => (
          <Card
            key={s.key}
            className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
            onClick={() => onSelect(s.label)}
          >
            <CardContent className="pt-4 pb-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.emoji}</span>
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{s.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
