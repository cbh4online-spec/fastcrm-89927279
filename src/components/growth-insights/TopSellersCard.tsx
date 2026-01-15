import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Trophy, 
  TrendingUp, 
  Target,
  Zap,
  Star,
  ChevronRight
} from 'lucide-react';
import { TopSeller } from '@/types/growth-insights';
import { cn } from '@/lib/utils';

interface TopSellersCardProps {
  sellers: TopSeller[];
  isLoading?: boolean;
  onViewSeller?: (sellerId: string) => void;
}

export function TopSellersCard({ 
  sellers, 
  isLoading,
  onViewSeller
}: TopSellersCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Top 10 Vendedores
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

  if (sellers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Top 10 Vendedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Ainda não há dados suficientes.</p>
            <p className="text-sm">A performance será calculada com base nas oportunidades.</p>
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

  const getInsightBadge = (seller: TopSeller) => {
    const strengthInsights = seller.insights.filter(i => i.type === 'strength');
    if (strengthInsights.length > 0) {
      return strengthInsights[0].message;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Top 10 Vendedores
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          Performance comercial baseada em impacto real
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sellers.map((seller, index) => {
            const insightBadge = getInsightBadge(seller);
            const hasMetTarget = seller.targetProgress >= 100;

            return (
              <div 
                key={seller.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/50 cursor-pointer",
                  hasMetTarget && "border-green-200 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10"
                )}
                onClick={() => onViewSeller?.(seller.id)}
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
                  {seller.avatarUrl && <AvatarImage src={seller.avatarUrl} />}
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {seller.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{seller.name}</span>
                    {hasMetTarget && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {seller.conversionRate.toFixed(0)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {seller.closeVelocity}d
                    </span>
                    <span>{seller.dealsWon} fechos</span>
                  </div>
                </div>

                {/* Revenue & Progress */}
                <div className="w-32">
                  <div className="font-semibold text-right mb-1">
                    {formatCurrency(seller.totalRevenue)}
                  </div>
                  {seller.targetProgress > 0 && (
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.min(seller.targetProgress, 100)} 
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {seller.targetProgress.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Top Product Badge */}
                {seller.topProducts.length > 0 && (
                  <Badge variant="outline" className="hidden md:flex text-xs">
                    {seller.topProducts[0].productName.slice(0, 15)}
                    {seller.topProducts[0].productName.length > 15 && '...'}
                  </Badge>
                )}

                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>

        {/* Performance Summary */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(sellers.reduce((sum, s) => sum + s.totalRevenue, 0))}
            </div>
            <div className="text-xs text-muted-foreground">Receita Total</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {(sellers.reduce((sum, s) => sum + s.conversionRate, 0) / sellers.length).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Conversão Média</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {sellers.reduce((sum, s) => sum + s.dealsWon, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total Fechos</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
