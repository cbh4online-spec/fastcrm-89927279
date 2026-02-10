import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

interface SponsoredBadgeProps {
  compact?: boolean;
}

export function SponsoredBadge({ compact }: SponsoredBadgeProps) {
  if (compact) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 border-primary/30 text-primary">
        <Megaphone className="h-2.5 w-2.5" />
        Patrocinado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
      <Megaphone className="h-3 w-3" />
      Patrocinado
    </Badge>
  );
}
