import { useStoreSponsors, type StoreSponsor } from "@/hooks/useStoreAds";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Crown, Medal, Star } from "lucide-react";

const tierColors: Record<string, string> = {
  gold: "border-amber-400 bg-amber-50 dark:bg-amber-950/20",
  silver: "border-gray-400 bg-gray-50 dark:bg-gray-950/20",
  bronze: "border-orange-400 bg-orange-50 dark:bg-orange-950/20",
};

const tierLabels: Record<string, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  gold: <Crown className="h-3 w-3" />,
  silver: <Medal className="h-3 w-3" />,
  bronze: <Star className="h-3 w-3" />,
};

interface SponsorsShowcaseProps {
  workspaceId: string;
  variant?: "bar" | "grid" | "footer";
  maxItems?: number;
  tierFilter?: "gold" | "silver" | "bronze";
  title?: string;
}

export function SponsorsShowcase({
  workspaceId,
  variant = "bar",
  maxItems,
  tierFilter,
  title = "Parceiros",
}: SponsorsShowcaseProps) {
  const { data: allSponsors = [] } = useStoreSponsors(workspaceId);

  const sponsors = (() => {
    let filtered = tierFilter ? allSponsors.filter((s) => s.tier === tierFilter) : allSponsors;
    if (maxItems) filtered = filtered.slice(0, maxItems);
    return filtered;
  })();

  if (sponsors.length === 0) return null;

  if (variant === "bar") {
    return (
      <div className="py-8">
        <h3 className="text-center text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
          {title}
        </h3>
        <div className="flex flex-wrap justify-center gap-6">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.website_url || "#"}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all hover:shadow-md ${
                tierColors[sponsor.tier] || tierColors.bronze
              }`}
            >
              {sponsor.logo_url && (
                <img src={sponsor.logo_url} alt={sponsor.name} className="h-8 w-auto object-contain" />
              )}
              <div>
                <p className="text-sm font-medium">{sponsor.name}</p>
                {sponsor.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{sponsor.description}</p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px]">{tierLabels[sponsor.tier]}</Badge>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="py-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
          {title}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.website_url || "#"}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`flex flex-col gap-3 p-5 rounded-xl border-2 transition-all hover:shadow-lg ${
                tierColors[sponsor.tier] || tierColors.bronze
              }`}
            >
              <div className="flex items-center gap-3">
                {sponsor.logo_url ? (
                  <img src={sponsor.logo_url} alt={sponsor.name} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center font-bold text-lg">
                    {sponsor.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{sponsor.name}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium capitalize">
                    {TIER_ICONS[sponsor.tier]} {tierLabels[sponsor.tier]}
                  </span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              {sponsor.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{sponsor.description}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    );
  }

  // variant === "footer"
  return (
    <div className="py-4 border-t">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{title}:</span>
        {sponsors.map((sponsor) => (
          <a
            key={sponsor.id}
            href={sponsor.website_url || "#"}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {sponsor.logo_url && (
              <img src={sponsor.logo_url} alt={sponsor.name} className="h-5 w-auto object-contain" />
            )}
            <span>{sponsor.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
