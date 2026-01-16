import { 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  Building2,
  User,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { OpportunityAtRisk } from '@/hooks/useMemberPanel';
import { Link } from 'react-router-dom';

interface OpportunitiesDealsProps {
  opportunities: OpportunityAtRisk[];
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const riskColors: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  low: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
};

export function OpportunitiesDeals({
  opportunities,
  isLoading,
}: OpportunitiesDealsProps) {
  const atRisk = opportunities.filter(o => o.risk_level === 'high' || o.risk_level === 'medium');
  const hotDeals = opportunities.filter(o => o.probability >= 70);
  const totalValue = opportunities.reduce((sum, o) => sum + o.value, 0);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg h-full">
        <CardHeader className="pb-2">
          <div className="animate-pulse h-6 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse h-24 bg-muted rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg h-full">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Target className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Pipeline Pessoal</CardTitle>
              <p className="text-xs text-muted-foreground">
                {opportunities.length} oportunidades • {formatCurrency(totalValue)}
              </p>
            </div>
          </div>
          <Link to="/dashboard/opportunities">
            <Button variant="ghost" size="sm" className="gap-1">
              Ver tudo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">{atRisk.length} em risco</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{hotDeals.length} quase fechados</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {opportunities.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Sem oportunidades ativas</p>
            <p className="text-sm text-muted-foreground/70">Cria uma nova oportunidade</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="p-4 space-y-3">
              {opportunities.slice(0, 6).map((opp) => {
                const colors = riskColors[opp.risk_level];

                return (
                  <Link
                    key={opp.id}
                    to={`/dashboard/opportunities`}
                    className="block"
                  >
                    <div
                      className={cn(
                        "p-4 rounded-xl border transition-all hover:shadow-md hover:scale-[1.01]",
                        colors.bg,
                        colors.border
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{opp.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {opp.company_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {opp.company_name}
                              </span>
                            )}
                            {opp.contact_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {opp.contact_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-lg">{formatCurrency(opp.value)}</span>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px]">
                          {opp.stage}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {opp.days_inactive} dias sem atividade
                        </div>
                      </div>

                      {/* Probability bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Probabilidade</span>
                          <span className="font-medium">{opp.probability}%</span>
                        </div>
                        <Progress value={opp.probability} className="h-1.5" />
                      </div>

                      {/* AI Action suggestion */}
                      {opp.risk_level !== 'low' && (
                        <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-background/50 border">
                          <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{opp.action_needed}</p>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
