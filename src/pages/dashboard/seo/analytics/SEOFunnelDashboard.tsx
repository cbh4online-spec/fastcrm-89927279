import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { ArrowDown, TrendingUp, DollarSign } from 'lucide-react';

// Mock funnel data
const funnelSteps = [
  { name: 'SEO Page View', count: 15420, value: 0, dropoff: 0 },
  { name: 'Generate Started', count: 4850, value: 0, dropoff: 68.5 },
  { name: 'Signup Completed', count: 1240, value: 0, dropoff: 74.4 },
  { name: 'Export Completed', count: 680, value: 0, dropoff: 45.2 },
  { name: 'Purchase Completed', count: 145, value: 7250, dropoff: 78.7 },
];

const breakdownByPageType = [
  { type: 'tool', seoView: 4200, generated: 1850, signup: 520, exported: 340, purchase: 72, revenue: 3600 },
  { type: 'keyword', seoView: 5800, generated: 1420, signup: 380, exported: 180, purchase: 38, revenue: 1900 },
  { type: 'template', seoView: 2100, generated: 890, signup: 210, exported: 95, purchase: 22, revenue: 1100 },
  { type: 'category', seoView: 2400, generated: 520, signup: 98, exported: 48, purchase: 9, revenue: 450 },
  { type: 'compare', seoView: 920, generated: 170, signup: 32, exported: 17, purchase: 4, revenue: 200 },
];

export function SEOFunnelDashboard() {
  const [breakdown, setBreakdown] = useState<string>('all');

  const totalRevenue = breakdownByPageType.reduce((sum, d) => sum + d.revenue, 0);
  const overallConversion = ((funnelSteps[4].count / funnelSteps[0].count) * 100).toFixed(2);
  const avgOrderValue = (totalRevenue / funnelSteps[4].count).toFixed(0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Funnel SEO → Receita</h2>
        <p className="text-sm text-muted-foreground">
          Onde o dinheiro nasce (ou morre)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              +23% vs período anterior
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversão Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallConversion}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              SEO View → Purchase
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{avgOrderValue}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Por compra
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnelSteps[4].count}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Este período
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnelSteps.map((step, index) => {
              const widthPercent = (step.count / funnelSteps[0].count) * 100;
              const isLast = index === funnelSteps.length - 1;

              return (
                <div key={step.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{step.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{step.count.toLocaleString()}</span>
                      {step.value > 0 && (
                        <Badge variant="outline" className="text-green-600">
                          <DollarSign className="h-3 w-3 mr-1" />
                          €{step.value.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="h-10 bg-muted rounded-lg overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isLast ? 'bg-green-500' : 'bg-primary'
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    {!isLast && step.dropoff > 0 && (
                      <div className="absolute right-0 -bottom-5 flex items-center gap-1 text-xs text-red-500">
                        <ArrowDown className="h-3 w-3" />
                        {step.dropoff}% drop-off
                      </div>
                    )}
                  </div>
                  {!isLast && <div className="h-6" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown by Page Type */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Breakdown por Tipo de Página</CardTitle>
          <Select value={breakdown} onValueChange={setBreakdown}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="tool">Tools</SelectItem>
              <SelectItem value="keyword">Keywords</SelectItem>
              <SelectItem value="template">Templates</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {breakdownByPageType
              .filter((d) => breakdown === 'all' || d.type === breakdown)
              .sort((a, b) => b.revenue - a.revenue)
              .map((item) => {
                const conversionRate = ((item.purchase / item.seoView) * 100).toFixed(2);
                return (
                  <div key={item.type} className="p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="capitalize text-sm">
                        {item.type}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Conv: {conversionRate}%
                        </span>
                        <Badge variant="default" className="text-green-600 bg-green-100 dark:bg-green-900">
                          €{item.revenue.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-bold">{item.seoView.toLocaleString()}</div>
                        <div className="text-muted-foreground">Views</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{item.generated.toLocaleString()}</div>
                        <div className="text-muted-foreground">Generated</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{item.signup}</div>
                        <div className="text-muted-foreground">Signups</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{item.exported}</div>
                        <div className="text-muted-foreground">Exports</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{item.purchase}</div>
                        <div className="text-muted-foreground">Purchases</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Key Insight */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Insight Principal</p>
              <p className="text-sm text-muted-foreground mt-1">
                Páginas de <strong>Tools</strong> geram 50% da receita com apenas 27% das views. 
                Considerar criar mais páginas de ferramentas e promover via SEO interno.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
