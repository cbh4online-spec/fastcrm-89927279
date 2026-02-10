import { useStoreSponsors, type StoreSponsor } from "@/hooks/useStoreAds";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

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

interface StoreSponsorsBarProps {
  workspaceId: string;
}

export function StoreSponsorsBar({ workspaceId }: StoreSponsorsBarProps) {
  const { data: sponsors = [] } = useStoreSponsors(workspaceId);

  if (sponsors.length === 0) return null;

  return (
    <div className="py-8">
      <h3 className="text-center text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
        Parceiros
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
              <img
                src={sponsor.logo_url}
                alt={sponsor.name}
                className="h-8 w-auto object-contain"
              />
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
