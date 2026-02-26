import { formatCurrency } from '@/lib/formatters';
import { MapPin, Coins, Users } from 'lucide-react';

interface EventTooltipContentProps {
  metadata: Record<string, any>;
  title: string;
}

export function EventTooltipContent({ metadata, title }: EventTooltipContentProps) {
  const location = metadata?._location;
  const price = metadata?._price;
  const currency = metadata?._currency || 'EUR';
  const rsvpCounts = metadata?._rsvpCounts as { confirmed: number; invited: number; total: number } | undefined;

  const hasDetails = location || (price && price > 0) || (rsvpCounts && rsvpCounts.total > 0);

  return (
    <div className="space-y-1.5 max-w-[220px]">
      <p className="font-semibold text-sm text-popover-foreground truncate">{title}</p>
      {hasDetails && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{location}</span>
            </div>
          )}
          {price > 0 && (
            <div className="flex items-center gap-1.5">
              <Coins className="h-3 w-3 flex-shrink-0" />
              <span>{formatCurrency(price, currency)}</span>
            </div>
          )}
          {rsvpCounts && rsvpCounts.total > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 flex-shrink-0" />
              <span>{rsvpCounts.confirmed} confirmados / {rsvpCounts.invited} convidados</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
