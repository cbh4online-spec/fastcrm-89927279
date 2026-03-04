import { useSystemMetrics, getHealthLabel } from '@/hooks/useSystemMetrics';
import { Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SystemHealthBadge() {
  const { latestHealthScore, isLoading } = useSystemMetrics(7);

  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (latestHealthScore === null) return null;

  const { label, color } = getHealthLabel(latestHealthScore);

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/50 bg-muted/20 text-xs font-medium">
      <Heart className={cn("h-3.5 w-3.5", color)} />
      <span className={color}>{latestHealthScore}</span>
      <span className="text-muted-foreground">· {label}</span>
    </div>
  );
}
