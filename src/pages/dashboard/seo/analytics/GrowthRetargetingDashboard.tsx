import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Users, Target, DollarSign, ExternalLink, TrendingUp, Zap, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Mock audience segments
const audienceSegments = [
  {
    id: 'generated_not_exported',
    name: 'Generated but Not Exported',
    description: 'Geraram keywords mas não exportaram',
    size: 4520,
    potentialValue: 22600,
    conversionPotential: 'high',
    color: 'hsl(var(--primary))',
    suggestedAction: 'Retargeting com oferta de export gratuito',
  },
  {
    id: 'exported_not_upgraded',
    name: 'Exported but Not Upgraded',
    description: 'Exportaram keywords mas não fizeram upgrade',
    size: 1850,
    potentialValue: 27750,
    conversionPotential: 'very-high',
    color: 'hsl(142, 76%, 36%)',
    suggestedAction: 'Retargeting com desconto de primeiro mês',
  },
  {
    id: 'visited_compare',
    name: 'Visited Compare Pages',
    description: 'Visitaram páginas de comparação',
    size: 2340,
    potentialValue: 35100,
    conversionPotential: 'very-high',
    color: 'hsl(262, 83%, 58%)',
    suggestedAction: 'Retargeting com case studies e testimonials',
  },
  {
    id: 'viewed_pricing',
    name: 'Viewed Pricing',
    description: 'Visitaram a página de pricing',
    size: 1120,
    potentialValue: 28000,
    conversionPotential: 'very-high',
    color: 'hsl(25, 95%, 53%)',
    suggestedAction: 'Retargeting com oferta limitada',
  },
  {
    id: 'signup_abandoned',
    name: 'Signup Abandoned',
    description: 'Iniciaram signup mas não completaram',
    size: 680,
    potentialValue: 10200,
    conversionPotential: 'high',
    color: 'hsl(199, 89%, 48%)',
    suggestedAction: 'Email recovery + retargeting',
  },
];

const pieData = audienceSegments.map((seg) => ({
  name: seg.name,
  value: seg.size,
  color: seg.color,
}));

const conversionPotentialConfig = {
  'very-high': { label: 'Muito Alto', color: 'bg-green-500', textColor: 'text-green-700' },
  'high': { label: 'Alto', color: 'bg-blue-500', textColor: 'text-blue-700' },
  'medium': { label: 'Médio', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  'low': { label: 'Baixo', color: 'bg-gray-500', textColor: 'text-gray-700' },
};

const chartConfig = {
  generated_not_exported: { label: 'Gen. not Exported', color: 'hsl(var(--primary))' },
  exported_not_upgraded: { label: 'Exp. not Upgraded', color: 'hsl(142, 76%, 36%)' },
  visited_compare: { label: 'Visited Compare', color: 'hsl(262, 83%, 58%)' },
  viewed_pricing: { label: 'Viewed Pricing', color: 'hsl(25, 95%, 53%)' },
  signup_abandoned: { label: 'Signup Abandoned', color: 'hsl(199, 89%, 48%)' },
};

export function GrowthRetargetingDashboard() {
  const totalAudience = audienceSegments.reduce((sum, seg) => sum + seg.size, 0);
  const totalPotentialValue = audienceSegments.reduce((sum, seg) => sum + seg.potentialValue, 0);
  const highValueSegments = audienceSegments.filter(
    (seg) => seg.conversionPotential === 'very-high'
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Growth & Retargeting</h2>
        <p className="text-sm text-muted-foreground">
          Audiências para Meta Ads e campanhas de conversão
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Audiência
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAudience.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">utilizadores qualificados</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Potencial
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{totalPotentialValue.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">se convertidos</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Segmentos Quentes
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highValueSegments.length}</div>
            <div className="text-xs text-muted-foreground">alta probabilidade</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ROI Estimado
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2x</div>
            <div className="text-xs text-muted-foreground">em retargeting</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Audiências</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Priority Ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Prioridade de Targeting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {audienceSegments
                .sort((a, b) => b.potentialValue - a.potentialValue)
                .map((segment, index) => {
                  const config = conversionPotentialConfig[segment.conversionPotential as keyof typeof conversionPotentialConfig];
                  return (
                    <div key={segment.id} className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{segment.name}</span>
                          <Badge variant="outline" className={config.textColor}>
                            {config.label}
                          </Badge>
                        </div>
                        <Progress 
                          value={(segment.potentialValue / totalPotentialValue) * 100} 
                          className="h-2 mt-1"
                        />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          €{segment.potentialValue.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {segment.size.toLocaleString()} users
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Segments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Segmentos Detalhados & Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {audienceSegments.map((segment) => {
              const config = conversionPotentialConfig[segment.conversionPotential as keyof typeof conversionPotentialConfig];
              return (
                <div key={segment.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: segment.color }}
                        />
                        <h3 className="font-semibold">{segment.name}</h3>
                        <Badge variant="outline" className={config.textColor}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {segment.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{segment.size.toLocaleString()}</div>
                      <div className="text-sm text-green-600">
                        €{segment.potentialValue.toLocaleString()} potencial
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Ação sugerida:</span>
                      <span className="font-medium">{segment.suggestedAction}</span>
                    </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => {
                          toast.success(`Audiência "${segment.name}" criada`, {
                            description: `${segment.size.toLocaleString()} utilizadores exportados para Meta Custom Audience.`,
                            action: {
                              label: 'Ver no Meta',
                              onClick: () => window.open('https://business.facebook.com/adsmanager/audiences', '_blank')
                            }
                          });
                        }}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Criar Audiência
                      </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Pronto para começar?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure o pixel Meta e comece a construir audiências automaticamente
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search);
                  params.set('tab', 'settings');
                  window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                  toast.info('Configure o Meta Pixel ID na secção Tracking & Analytics');
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar Pixel
              </Button>
              <Button
                onClick={() => {
                  toast.success('Exportação iniciada', {
                    description: 'As audiências serão exportadas para formato CSV.',
                  });
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Exportar Audiências
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
