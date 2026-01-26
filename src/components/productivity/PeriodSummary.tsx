import { useMemo } from 'react';
import { 
  BarChart3, 
  Euro, 
  ShoppingCart, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2,
  Target,
  TrendingUp,
  Briefcase,
  FileSignature,
  Users,
  Receipt,
  Wallet,
  CheckSquare,
  FileText,
  Presentation,
  Percent,
  Hash,
  LucideIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProductivityGoal } from '@/hooks/useProductivityCoach';

// Mapeamento de ícones por unidade
const UNIT_ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  'vendas': { icon: ShoppingCart, color: 'text-green-500' },
  'negócios': { icon: Briefcase, color: 'text-green-600' },
  'contratos': { icon: FileSignature, color: 'text-green-700' },
  'reuniões': { icon: Calendar, color: 'text-blue-500' },
  'chamadas': { icon: Phone, color: 'text-blue-600' },
  'emails': { icon: Mail, color: 'text-blue-700' },
  'contactos': { icon: Users, color: 'text-blue-800' },
  '€ (euro)': { icon: Euro, color: 'text-yellow-500' },
  'faturação': { icon: Receipt, color: 'text-yellow-600' },
  'comissões': { icon: Wallet, color: 'text-yellow-700' },
  'tarefas': { icon: CheckSquare, color: 'text-purple-500' },
  'propostas': { icon: FileText, color: 'text-purple-600' },
  'apresentações': { icon: Presentation, color: 'text-purple-700' },
  '% (percentagem)': { icon: Percent, color: 'text-orange-500' },
  'unidades': { icon: Hash, color: 'text-orange-600' },
};

// Função para obter ícone por unidade (case insensitive)
const getUnitIcon = (unit: string): { icon: LucideIcon; color: string } => {
  const normalizedUnit = unit.toLowerCase();
  return UNIT_ICON_MAP[normalizedUnit] || { icon: Target, color: 'text-muted-foreground' };
};

// Função para formatar valores baseado na unidade
const formatValue = (value: number, unit: string): string => {
  const normalizedUnit = unit.toLowerCase();
  
  // Formatação financeira
  if (['€ (euro)', 'faturação', 'comissões', 'euros'].some(u => normalizedUnit.includes(u.toLowerCase())) || 
      normalizedUnit.includes('euro') || normalizedUnit.includes('€')) {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  
  // Formatação percentagem
  if (normalizedUnit.includes('percentagem') || normalizedUnit.includes('%')) {
    return `${Math.round(value)}%`;
  }
  
  // Formatação numérica padrão
  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface PeriodSummaryProps {
  goals: ProductivityGoal[];
}

interface UnitSummary {
  current: number;
  target: number;
  count: number;
  completedCount: number;
}

export function PeriodSummary({ goals }: PeriodSummaryProps) {
  // Agrupar por unidade e calcular totais (usando apenas valores manuais)
  const { summaryByUnit, totalProgress, completedGoals, totalGoals } = useMemo(() => {
    const grouped: Record<string, UnitSummary> = {};
    let totalCurrent = 0;
    let totalTarget = 0;
    let completed = 0;
    
    goals.forEach(goal => {
      const unit = goal.unit || 'Unidades';
      const currentValue = goal.current_value || 0;
      const targetValue = goal.target_value || 0;
      
      if (!grouped[unit]) {
        grouped[unit] = { current: 0, target: 0, count: 0, completedCount: 0 };
      }
      
      grouped[unit].current += currentValue;
      grouped[unit].target += targetValue;
      grouped[unit].count += 1;
      
      // Verificar se a meta está concluída (progresso >= 100%)
      if (targetValue > 0 && currentValue >= targetValue) {
        grouped[unit].completedCount += 1;
        completed += 1;
      }
      
      totalCurrent += currentValue;
      totalTarget += targetValue;
    });
    
    const progress = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0;
    
    return {
      summaryByUnit: grouped,
      totalProgress: progress,
      completedGoals: completed,
      totalGoals: goals.length,
    };
  }, [goals]);

  // Se não há metas, não renderizar
  if (goals.length === 0) {
    return null;
  }

  const unitEntries = Object.entries(summaryByUnit);

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Resumo do Período</h3>
        </div>

        {/* Progresso Geral */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Progresso Geral</span>
            <span className={cn(
              "text-lg font-bold",
              totalProgress >= 100 ? "text-green-600" : 
              totalProgress >= 75 ? "text-blue-600" : 
              totalProgress >= 50 ? "text-yellow-600" : "text-foreground"
            )}>
              {totalProgress}%
            </span>
          </div>
          <Progress 
            value={totalProgress} 
            className={cn(
              "h-3",
              totalProgress >= 100 && "[&>div]:bg-green-500"
            )}
          />
        </div>

        {/* Breakdown por Unidade */}
        {unitEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            {unitEntries.map(([unit, data]) => {
              const { icon: UnitIcon, color } = getUnitIcon(unit);
              const unitProgress = data.target > 0 ? Math.round((data.current / data.target) * 100) : 0;
              const isComplete = unitProgress >= 100;
              
              return (
                <div 
                  key={unit} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    isComplete ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-muted/50 border-border"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    isComplete ? "bg-green-100 dark:bg-green-900/50" : "bg-background"
                  )}>
                    <UnitIcon className={cn("h-4 w-4", isComplete ? "text-green-600" : color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate capitalize">{unit}</p>
                    <p className={cn(
                      "font-semibold text-sm",
                      isComplete && "text-green-600"
                    )}>
                      {formatValue(data.current, unit)} / {formatValue(data.target, unit)}
                    </p>
                  </div>
                  {isComplete && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer com contagem de metas */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={cn(
              "h-4 w-4",
              completedGoals === totalGoals && totalGoals > 0 ? "text-green-600" : "text-muted-foreground"
            )} />
            <span className="text-sm text-muted-foreground">
              <span className={cn(
                "font-medium",
                completedGoals === totalGoals && totalGoals > 0 ? "text-green-600" : "text-foreground"
              )}>
                {completedGoals}
              </span>
              {' '}de{' '}
              <span className="font-medium text-foreground">{totalGoals}</span>
              {' '}metas concluídas
            </span>
          </div>
          {completedGoals === totalGoals && totalGoals > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              Período Completo!
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
