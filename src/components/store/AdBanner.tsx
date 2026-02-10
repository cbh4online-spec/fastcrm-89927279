import { useEffect, useRef } from "react";
import { useStoreAds, useTrackAdClick } from "@/hooks/useStoreAds";

interface AdBannerProps {
  workspaceId: string;
  placement?: string;
  className?: string;
}

export function AdBanner({ workspaceId, placement, className }: AdBannerProps) {
  const { data: ads = [] } = useStoreAds(workspaceId, placement);
  const trackClick = useTrackAdClick();
  const impressionTracked = useRef(false);

  // Pick a random active ad
  const ad = ads.length > 0 ? ads[Math.floor(Math.random() * ads.length)] : null;

  if (!ad) return null;

  return (
    <a
      href={ad.link_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => trackClick.mutate(ad.id)}
      className={`block relative overflow-hidden rounded-xl group ${className || ""}`}
    >
      <img
        src={ad.image_url}
        alt={ad.alt_text || ad.title}
        className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300"
      />
      <span className="absolute top-2 right-2 bg-background/70 text-[9px] text-muted-foreground px-1.5 py-0.5 rounded">
        Publicidade
      </span>
    </a>
  );
}
