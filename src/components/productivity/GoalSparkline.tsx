import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { HistoricalDataPoint } from '@/hooks/useGoalHistoricalProgress';

interface GoalSparklineProps {
  data: HistoricalDataPoint[];
  targetValue: number;
  className?: string;
  showCumulative?: boolean;
  height?: number;
}

export function GoalSparkline({ 
  data, 
  targetValue, 
  className,
  showCumulative = true,
  height = 60
}: GoalSparklineProps) {
  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(point => ({
      ...point,
      displayValue: showCumulative ? point.cumulative : point.value,
      formattedDate: format(parseISO(point.date), 'dd MMM', { locale: pt }),
    }));
  }, [data, showCumulative]);

  // Determinar cor baseada no progresso
  const progressColor = useMemo(() => {
    if (chartData.length === 0) return 'hsl(var(--primary))';
    
    const lastValue = chartData[chartData.length - 1].displayValue;
    const progress = targetValue > 0 ? (lastValue / targetValue) * 100 : 0;
    
    if (progress >= 100) return 'hsl(142, 71%, 45%)'; // green-500
    if (progress >= 75) return 'hsl(217, 91%, 60%)';  // blue-500
    if (progress >= 50) return 'hsl(45, 93%, 47%)';   // yellow-500
    return 'hsl(var(--primary))';
  }, [chartData, targetValue]);

  if (chartData.length < 2) {
    return null;
  }

  const maxValue = Math.max(
    ...chartData.map(d => d.displayValue),
    targetValue
  );

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart 
          data={chartData} 
          margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={progressColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={progressColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          
          {/* Linha de referência do objetivo */}
          {targetValue > 0 && (
            <ReferenceLine 
              y={targetValue} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          )}
          
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as typeof chartData[0];
              return (
                <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="font-medium text-foreground">{point.formattedDate}</p>
                  <p className="text-muted-foreground">
                    {showCumulative ? 'Total: ' : 'Dia: '}
                    <span className="font-semibold text-foreground">
                      {new Intl.NumberFormat('pt-PT').format(point.displayValue)}
                    </span>
                  </p>
                  {targetValue > 0 && (
                    <p className="text-muted-foreground">
                      Objetivo: {new Intl.NumberFormat('pt-PT').format(targetValue)}
                    </p>
                  )}
                </div>
              );
            }}
            cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
          />
          
          <Area
            type="monotone"
            dataKey="displayValue"
            stroke={progressColor}
            strokeWidth={2}
            fill="url(#sparklineGradient)"
            dot={false}
            activeDot={{ 
              r: 4, 
              fill: progressColor,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Versão mini do sparkline para cards compactos
 */
interface MiniSparklineProps {
  data: HistoricalDataPoint[];
  className?: string;
}

export function MiniSparkline({ data, className }: MiniSparklineProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(point => ({
      value: point.cumulative,
    }));
  }, [data]);

  if (chartData.length < 2) {
    return null;
  }

  // Determinar se há tendência positiva
  const isPositive = chartData.length >= 2 && 
    chartData[chartData.length - 1].value >= chartData[0].value;

  return (
    <div className={cn('w-16 h-6', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="miniSparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="5%" 
                stopColor={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} 
                stopOpacity={0.3} 
              />
              <stop 
                offset="95%" 
                stopColor={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'} 
                stopOpacity={0} 
              />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)'}
            strokeWidth={1.5}
            fill="url(#miniSparklineGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
