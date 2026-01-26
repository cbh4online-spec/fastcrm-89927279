import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";

interface GoalProgressSparklineProps {
  data: { date: string; value: number }[];
  targetValue: number;
  color?: string;
  height?: number;
}

export function GoalProgressSparkline({ 
  data, 
  targetValue, 
  color = "hsl(var(--primary))",
  height = 40 
}: GoalProgressSparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center text-muted-foreground text-xs"
        style={{ height }}
      >
        Sem dados
      </div>
    );
  }

  // Prepare data with target line
  const chartData = data.map(d => ({
    ...d,
    target: targetValue,
  }));

  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
                  <p className="text-muted-foreground">
                    {format(parseISO(data.date), "d MMM", { locale: pt })}
                  </p>
                  <p className="font-medium text-foreground">
                    Valor: {data.value}
                  </p>
                  <p className="text-muted-foreground">
                    Meta: {targetValue}
                  </p>
                </div>
              );
            }}
          />
          
          <ReferenceLine 
            y={targetValue} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3" 
            strokeOpacity={0.5}
          />
          
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill="url(#sparklineGradient)"
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
