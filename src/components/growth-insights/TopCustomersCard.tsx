import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Crown, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  Lightbulb,
  Mail,
  Phone,
  ChevronRight
} from 'lucide-react';
import { TopCustomer, CHURN_RISK_CONFIG } from '@/types/growth-insights';
import { cn } from '@/lib/utils';

interface TopCustomersCardProps {
  customers: TopCustomer[];
  isLoading?: boolean;
  onViewCustomer?: (customerId: string) => void;
  onContactCustomer?: (customerId: string, method: 'email' | 'phone') => void;
}

export function TopCustomersCard({ 
  customers, 
  isLoading,
  onViewCustomer,
  onContactCustomer
}: TopCustomersCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Top 10 Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
                <div className="h-4 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Top 10 Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Ainda não há dados suficientes.</p>
            <p className="text-sm">Crie oportunidades para ver os top clientes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Top 10 Clientes
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          Clientes que mais contribuem para o crescimento
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {customers.map((customer, index) => {
            const riskConfig = CHURN_RISK_CONFIG[customer.churnRisk];
            const hasOpportunity = customer.insights.some(i => i.type === 'opportunity');
            const hasRisk = customer.churnRisk === 'high' || customer.churnRisk === 'critical';

            return (
              <div 
                key={customer.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/50 cursor-pointer",
                  hasRisk && "border-orange-200 dark:border-orange-900/30 bg-orange-50/30 dark:bg-orange-900/10"
                )}
                onClick={() => onViewCustomer?.(customer.id)}
              >
                {/* Rank */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  index === 0 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  index === 1 && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                  index === 2 && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                  index > 2 && "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {customer.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{customer.name}</span>
                    {hasOpportunity && (
                      <Lightbulb className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{customer.purchaseCount} compras</span>
                    {customer.lastPurchaseDate && (
                      <>
                        <span>•</span>
                        <span>Última: {new Date(customer.lastPurchaseDate).toLocaleDateString('pt-PT')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Revenue & Risk */}
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(customer.totalRevenue)}</div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", riskConfig.color, riskConfig.bgColor)}
                  >
                    {riskConfig.emoji} {riskConfig.label}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {customer.email && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => onContactCustomer?.(customer.id, 'email')}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Insights Summary */}
        {customers.some(c => c.insights.length > 0) && (
          <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Insights da IA
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {customers
                .flatMap(c => c.insights.filter(i => i.actionable))
                .slice(0, 3)
                .map((insight, i) => (
                  <p key={i}>• {insight.message}</p>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
