import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BenchmarkAxis } from "@/data/adaptiveDashboardMock";

interface BenchmarkCardProps {
  benchmarks: BenchmarkAxis[];
  textSizeClass?: string;
  className?: string;
}

function BarSegment({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-12 text-right">{value.toLocaleString('pt-PT')}</span>
    </div>
  );
}

export function BenchmarkCard({ benchmarks, textSizeClass = 'text-base', className }: BenchmarkCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className={cn("text-sm font-semibold", textSizeClass === 'text-lg' && 'text-base')}>
          Benchmarking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {benchmarks.map(axis => {
          const max = Math.max(axis.individual, axis.team, axis.topPerformer, axis.industry) * 1.1;
          return (
            <div key={axis.label} className="space-y-1.5">
              <p className="text-xs font-semibold text-foreground">{axis.label}</p>
              <BarSegment value={axis.individual} max={max} color="bg-primary" label="Tu" />
              <BarSegment value={axis.team} max={max} color="bg-muted-foreground/40" label="Equipa" />
              <BarSegment value={axis.topPerformer} max={max} color="bg-success" label="Top" />
              <BarSegment value={axis.industry} max={max} color="bg-accent-foreground/20" label="Indústria" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
