import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TrustBadge } from "./offerPageTypes";

interface Props {
  badges: TrustBadge[];
  compact?: boolean;
}

function pickIcon(name: string): LucideIcon {
  const IconMap = Icons as unknown as Record<string, LucideIcon>;
  return IconMap[name] || Icons.ShieldCheck;
}

export function OfferTrustBadges({ badges, compact }: Props) {
  if (!badges?.length) return null;
  return (
    <div
      className={compact ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-3 sm:grid-cols-4"}
    >
      {badges.map((b, i) => {
        const Icon = pickIcon(b.icon);
        return (
          <div
            key={i}
            className="flex items-start gap-2 rounded-lg border bg-card p-2.5 text-left"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{b.title}</p>
              {b.description && (
                <p className="truncate text-[11px] text-muted-foreground">{b.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
