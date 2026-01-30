import { Users, Building2, UserCheck } from 'lucide-react';
import { useSegmentLiveCount } from '@/hooks/useMarketingSegments';
import type { MarketingSegment } from '@/types/marketing';

interface SegmentContactCountProps {
  segment: MarketingSegment;
}

export function SegmentContactCount({ segment }: SegmentContactCountProps) {
  const { data: count, isLoading } = useSegmentLiveCount({
    id: segment.id,
    filterRules: segment.filterRules,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4 animate-pulse" />
        <span className="text-sm">A calcular...</span>
      </div>
    );
  }

  const displayCount = count ?? segment.contactCount ?? 0;

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Users className="h-4 w-4" />
      <span className="text-sm">
        {displayCount} {displayCount === 1 ? 'registo' : 'registos'}
      </span>
    </div>
  );
}
