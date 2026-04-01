import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Mail, UserPlus, ShoppingCart, UserX, ChevronDown, ChevronUp, Zap, ArrowRight, RefreshCw, TrendingUp, Heart, Gift, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  trigger: string;
  steps: string[];
  category: 'acquisition' | 'engagement' | 'retention' | 'growth';
  scoringImpact: string;
}

const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'welcome-series',
    name: 'Onboarding / Welcome Series',
    description: 'Série de 3 emails para novos contactos. Apresenta, educa e converte.',
    icon: <UserPlus className="h-5 w-5 text-green-500" />,
    trigger: 'Novo contacto criado',
    steps: [
      'Email 1 (imediato): Boas-vindas + apresentação',
      'Email 2 (3 dias): Conteúdo educativo + caso de sucesso',
      'Email 3 (7 dias): CTA para agendar demo ou comprar',
      'Scoring: +2 por abertura, +5 por clique',
    ],
    category: 'acquisition',
    scoringImpact: '+2 a +15 pontos',
  },
  {
    id: 'lead-nurture',
    name: 'Lead Nurture',
    description: 'Sequência educativa para leads que demonstraram interesse mas não converteram.',
    icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
    trigger: 'Lead com score > 20 e sem oportunidade há 14 dias',
    steps: [
      'Email 1 (imediato): Conteúdo de valor + ROI',
      'Email 2 (5 dias): Testemunho + comparativo',
      'Email 3 (10 dias): Oferta limitada + demo grátis',
      'Não abriu nenhum → tarefa comercial',
    ],
    category: 'engagement',
    scoringImpact: '+5 a +25 pontos',
  },
  {
    id: 'reengagement',
    name: 'Reengagement (Cold 90d)',
    description: 'Campanha para contactos inativos há 90+ dias. Reaviva com conteúdo relevante.',
    icon: <RefreshCw className="h-5 w-5 text-amber-500" />,
    trigger: 'Contacto sem abertura há 90+ dias',
    steps: [
      'Email 1: "Sentimos a sua falta" + novidades',
      'Email 2 (5 dias): Oferta exclusiva de reativação',
      'Email 3 (10 dias): Última tentativa + unsubscribe suave',
      'Sem resposta → lifecycle stage = cold',
    ],
    category: 'retention',
    scoringImpact: '-15 a +10 pontos',
  },
  {
    id: 'win-back',
    name: 'Win-back (Opp Perdida)',
    description: 'Recuperar oportunidades perdidas com nova abordagem.',
    icon: <RotateCcw className="h-5 w-5 text-red-500" />,
    trigger: 'Oportunidade marcada como perdida',
    steps: [
      'Email 1 (3 dias): "O que podemos melhorar?" + pesquisa',
      'Email 2 (14 dias): Nova proposta de valor ou feature',
      'Email 3 (30 dias): Caso de sucesso de cliente semelhante',
      'Clicou → criar nova oportunidade + tarefa',
    ],
    category: 'retention',
    scoringImpact: '+5 a +25 pontos',
  },
  {
    id: 'upsell',
    name: 'Upsell / Cross-sell',
    description: 'Campanha para clientes activos com proposta de valor complementar.',
    icon: <Gift className="h-5 w-5 text-purple-500" />,
    trigger: 'Cliente activo com compra há 30-90 dias',
    steps: [
      'Email 1: Produto/serviço complementar',
      'Email 2 (7 dias): Benefício exclusivo para clientes',
      'Clicou → scoring +5 + notificar comercial',
    ],
    category: 'growth',
    scoringImpact: '+5 a +15 pontos',
  },
  {
    id: 'churn-prevention',
    name: 'Prevenção de Churn',
    description: 'Detectar sinais de risco e actuar preventivamente.',
    icon: <Heart className="h-5 w-5 text-pink-500" />,
    trigger: 'Cliente com engagement em queda ou reclamação',
    steps: [
      'Email 1: "Como podemos ajudar?" + NPS/feedback',
      'Email 2 (5 dias): Conteúdo de valor personalizado',
      'Sem resposta → tarefa urgente ao gestor de conta',
      'Bounce/complaint → lifecycle = at_risk',
    ],
    category: 'retention',
    scoringImpact: '-20 a +10 pontos',
  },
];

export function LifecycleAutomations() {
  const [activeAutomations, setActiveAutomations] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setActiveAutomations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info('Jornada desativada');
      } else {
        next.add(id);
        toast.success('Jornada ativada! Os triggers serão criados automaticamente.');
      }
      return next;
    });
  };

  const categoryLabels: Record<string, { label: string; color: string }> = {
    acquisition: { label: 'Aquisição', color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
    engagement: { label: 'Engagement', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
    retention: { label: 'Retenção', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
    growth: { label: 'Crescimento', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
  };

  const activeCount = activeAutomations.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Jornadas de Lifecycle
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fluxos automatizados baseados em eventos reais do CRM. Cada jornada actualiza o scoring do contacto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Badge variant="default" className="bg-green-600">
              {activeCount} ativa{activeCount > 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            CRM-Native
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {AUTOMATION_TEMPLATES.map((auto) => {
          const isActive = activeAutomations.has(auto.id);
          const isExpanded = expandedId === auto.id;
          const cat = categoryLabels[auto.category];

          return (
            <Card key={auto.id} className={isActive ? 'border-primary/30 bg-primary/5' : ''}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start gap-4">
                  <div className="mt-1 shrink-0">{auto.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{auto.name}</h3>
                      <Badge className={`text-[10px] px-1.5 ${cat.color}`}>
                        {cat.label}
                      </Badge>
                      {isActive && (
                        <Badge variant="default" className="text-[10px] px-1.5 bg-green-600">
                          Ativa
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{auto.description}</p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-amber-500" />
                        <span className="text-[11px] font-medium">Trigger:</span>
                        <span className="text-[11px] text-muted-foreground">{auto.trigger}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Scoring: {auto.scoringImpact}
                      </Badge>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-1.5 pl-2 border-l-2 border-primary/20">
                        {auto.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground">{step}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 mt-2 text-xs gap-1 px-1"
                      onClick={() => setExpandedId(isExpanded ? null : auto.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? 'Menos detalhes' : 'Ver passos'}
                    </Button>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggle(auto.id)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            💡 Cada jornada cria triggers automáticos, actualiza o scoring do contacto e alimenta o CRM timeline.
            <br />
            <span className="text-xs">Os eventos de campanha (aberturas, cliques, bounces) impactam directamente o score via lifecycle scoring.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
