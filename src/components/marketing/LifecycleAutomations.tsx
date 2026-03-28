import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Mail, UserPlus, ShoppingCart, UserX, ChevronDown, ChevronUp, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  trigger: string;
  steps: string[];
  category: 'acquisition' | 'engagement' | 'retention';
}

const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'welcome-series',
    name: 'Welcome Series',
    description: 'Série de 3 emails automáticos para novos contactos. Apresenta a empresa, educa sobre o produto e propõe uma ação.',
    icon: <UserPlus className="h-5 w-5 text-green-500" />,
    trigger: 'Novo contacto criado',
    steps: [
      'Email 1 (imediato): Boas-vindas + apresentação',
      'Email 2 (3 dias): Conteúdo educativo + caso de sucesso',
      'Email 3 (7 dias): CTA para agendar demo ou comprar',
    ],
    category: 'acquisition',
  },
  {
    id: 'deal-abandonment',
    name: 'Abandono de Deal',
    description: 'Email automático quando um deal fica parado ou é perdido. Recupera oportunidades que estavam a esfriar.',
    icon: <ShoppingCart className="h-5 w-5 text-amber-500" />,
    trigger: 'Deal muda para "perdido" ou sem atividade > 7 dias',
    steps: [
      'Email 1 (imediato): "Ainda podemos ajudar?"',
      'Email 2 (3 dias): Oferta especial ou benefício extra',
      'Email 3 (7 dias): Último follow-up + case study',
    ],
    category: 'engagement',
  },
  {
    id: 'win-back',
    name: 'Win-back / Reativação',
    description: 'Campanha automática para contactos inativos há mais de 90 dias. Reaviva o interesse com conteúdo relevante.',
    icon: <UserX className="h-5 w-5 text-red-500" />,
    trigger: 'Contacto inativo > 90 dias',
    steps: [
      'Email 1: "Sentimos a sua falta" + novidades',
      'Email 2 (5 dias): Oferta exclusiva de reativação',
      'Email 3 (10 dias): Última tentativa + unsubscribe suave',
    ],
    category: 'retention',
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
        toast.info('Automação desativada');
      } else {
        next.add(id);
        toast.success('Automação ativada! Será executada automaticamente.');
      }
      return next;
    });
  };

  const categoryLabels: Record<string, { label: string; color: string }> = {
    acquisition: { label: 'Aquisição', color: 'bg-green-500/10 text-green-700' },
    engagement: { label: 'Engagement', color: 'bg-blue-500/10 text-blue-700' },
    retention: { label: 'Retenção', color: 'bg-orange-500/10 text-orange-700' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Automações de Ciclo de Vida
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fluxos pré-configurados que ativa com 1 clique. Baseados em eventos do CRM.
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          CRM-Native
        </Badge>
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

                    <div className="flex items-center gap-1.5 mt-2">
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span className="text-[11px] font-medium">Trigger:</span>
                      <span className="text-[11px] text-muted-foreground">{auto.trigger}</span>
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
            💡 Estas automações são disparadas por eventos do CRM — deals, contactos e pipeline.
            <br />
            <span className="text-xs">Diferente de ferramentas externas, o FastCRM tem contexto de negócio completo.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
