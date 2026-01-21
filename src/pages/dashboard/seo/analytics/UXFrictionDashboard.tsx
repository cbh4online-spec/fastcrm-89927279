import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { AlertTriangle, MousePointer, Scroll, AlertCircle, Eye, ArrowDown } from 'lucide-react';

// Mock scroll depth data
const scrollDepthData = [
  { depth: '25%', keyword: 92, tool: 95, template: 88, category: 85, compare: 90 },
  { depth: '50%', keyword: 68, tool: 82, template: 72, category: 62, compare: 78 },
  { depth: '75%', keyword: 45, tool: 65, template: 55, category: 42, compare: 58 },
  { depth: '100%', keyword: 28, tool: 48, template: 38, category: 25, compare: 42 },
];

// Mock CTA click data
const ctaClickData = [
  { placement: 'Hero', clicks: 2450, impressions: 12000, ctr: 20.4 },
  { placement: 'Inline', clicks: 1280, impressions: 8500, ctr: 15.1 },
  { placement: 'Sidebar', clicks: 620, impressions: 9200, ctr: 6.7 },
  { placement: 'Sticky Bar', clicks: 890, impressions: 4500, ctr: 19.8 },
  { placement: 'Footer', clicks: 340, impressions: 6800, ctr: 5.0 },
];

// Mock error/friction data
const frictionData = [
  { type: 'error_shown', label: 'Erros Exibidos', count: 245, severity: 'high' },
  { type: 'empty_state', label: 'Estados Vazios', count: 520, severity: 'medium' },
  { type: 'rage_click', label: 'Rage Clicks', count: 180, severity: 'high' },
  { type: 'dead_click', label: 'Dead Clicks', count: 890, severity: 'medium' },
  { type: 'scroll_abandon', label: 'Abandono antes de Generate', count: 1250, severity: 'high' },
];

// Mock drop-off points
const dropOffPoints = [
  { section: 'Antes do Hero CTA', dropoff: 15, recommendation: 'Melhorar headline e proposta de valor' },
  { section: 'Input de Keyword', dropoff: 25, recommendation: 'Adicionar sugestões de keywords, placeholder melhor' },
  { section: 'A aguardar resultados', dropoff: 8, recommendation: 'Loading state mais informativo' },
  { section: 'Após ver resultados', dropoff: 35, recommendation: 'Gate de valor muito agressivo?' },
  { section: 'Formulário de signup', dropoff: 42, recommendation: 'Simplificar campos, social login' },
];

const chartConfig = {
  keyword: { label: 'Keyword', color: 'hsl(var(--primary))' },
  tool: { label: 'Tool', color: 'hsl(142, 76%, 36%)' },
  template: { label: 'Template', color: 'hsl(262, 83%, 58%)' },
  category: { label: 'Category', color: 'hsl(25, 95%, 53%)' },
  compare: { label: 'Compare', color: 'hsl(199, 89%, 48%)' },
};

export function UXFrictionDashboard() {
  const highSeverityCount = frictionData.filter(f => f.severity === 'high').reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">UX & Fricção</h2>
        <p className="text-sm text-muted-foreground">
          Otimização de conversão - que secção/layout ajustar primeiro?
        </p>
      </div>

      {/* Alert Banner */}
      {highSeverityCount > 500 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">
                  {highSeverityCount.toLocaleString()} eventos de alta fricção detetados
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Priorize correções nos pontos de "Abandono antes de Generate" e "Rage Clicks"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scroll até 50%
            </CardTitle>
            <Scroll className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72%</div>
            <div className="text-xs text-muted-foreground">média todas as páginas</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CTR Médio CTAs
            </CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">13.4%</div>
            <div className="text-xs text-muted-foreground">todos os placements</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Erros Críticos
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">245</div>
            <div className="text-xs text-muted-foreground">este período</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abandono Pré-Generate
            </CardTitle>
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">35%</div>
            <div className="text-xs text-muted-foreground">drop-off médio</div>
          </CardContent>
        </Card>
      </div>

      {/* Scroll Depth by Page Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scroll className="h-5 w-5" />
            Scroll Depth por Tipo de Página
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scrollDepthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="depth" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="keyword" fill="var(--color-keyword)" name="Keyword" />
                <Bar dataKey="tool" fill="var(--color-tool)" name="Tool" />
                <Bar dataKey="template" fill="var(--color-template)" name="Template" />
                <Bar dataKey="category" fill="var(--color-category)" name="Category" />
                <Bar dataKey="compare" fill="var(--color-compare)" name="Compare" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* CTA Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Performance de CTAs por Placement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ctaClickData
              .sort((a, b) => b.ctr - a.ctr)
              .map((cta) => (
                <div key={cta.placement} className="flex items-center gap-4">
                  <div className="w-24 font-medium">{cta.placement}</div>
                  <div className="flex-1">
                    <Progress 
                      value={cta.ctr * 3} 
                      className="h-3"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground w-20">
                      {cta.clicks.toLocaleString()} clicks
                    </span>
                    <Badge variant={cta.ctr > 15 ? 'default' : cta.ctr < 8 ? 'secondary' : 'outline'}>
                      {cta.ctr}% CTR
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Friction Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Eventos de Fricção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {frictionData.map((friction) => (
              <div key={friction.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    friction.severity === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <span className="font-medium">{friction.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{friction.count.toLocaleString()}</span>
                  <Badge variant={friction.severity === 'high' ? 'destructive' : 'secondary'}>
                    {friction.severity === 'high' ? 'Alta' : 'Média'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drop-off Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Análise de Drop-off e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dropOffPoints
              .sort((a, b) => b.dropoff - a.dropoff)
              .map((point, index) => (
                <div key={index} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{point.section}</span>
                    <Badge variant={point.dropoff > 30 ? 'destructive' : point.dropoff > 20 ? 'secondary' : 'outline'}>
                      {point.dropoff}% drop-off
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    💡 {point.recommendation}
                  </p>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
