import { Badge } from "@/components/ui/badge";
import { Flame, Clock, AlertTriangle, Sparkles, Tag } from "lucide-react";

interface StoreProductBadgesProps {
  createdAt?: string;
  trackStock?: boolean | null;
  stockQuantity?: number | null;
  isDiscounted?: boolean;
  isFeatured?: boolean | null;
  /** Show compact badges (for cards) or full badges (for product page) */
  compact?: boolean;
}

export function StoreProductBadges({
  createdAt,
  trackStock,
  stockQuantity,
  isDiscounted,
  isFeatured,
  compact = true,
}: StoreProductBadgesProps) {
  const badges: { label: string; icon: React.ReactNode; className: string; priority: number }[] = [];

  // "Última unidade!" — stock_quantity = 1
  if (trackStock && stockQuantity === 1) {
    badges.push({
      label: "Última unidade!",
      icon: <AlertTriangle className="h-3 w-3" />,
      className: "bg-destructive text-destructive-foreground border-destructive",
      priority: 1,
    });
  }
  // "Pouco stock" — stock_quantity <= 5
  else if (trackStock && stockQuantity != null && stockQuantity > 1 && stockQuantity <= 5) {
    badges.push({
      label: compact ? `Só ${stockQuantity}!` : `Apenas ${stockQuantity} em stock!`,
      icon: <Flame className="h-3 w-3" />,
      className: "bg-orange-500 text-white border-orange-500",
      priority: 2,
    });
  }

  // "Novo" — created in last 7 days
  if (createdAt) {
    const created = new Date(createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (created > sevenDaysAgo) {
      badges.push({
        label: "Novo",
        icon: <Sparkles className="h-3 w-3" />,
        className: "bg-blue-500 text-white border-blue-500",
        priority: 3,
      });
    }
  }

  // "Oferta" — tier pricing discount
  if (isDiscounted) {
    badges.push({
      label: "Oferta",
      icon: <Tag className="h-3 w-3" />,
      className: "bg-green-600 text-white border-green-600",
      priority: 4,
    });
  }

  if (badges.length === 0) return null;

  // Sort by priority, show max 2 in compact mode
  const sorted = badges.sort((a, b) => a.priority - b.priority);
  const displayed = compact ? sorted.slice(0, 2) : sorted;

  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((b) => (
        <Badge key={b.label} className={`gap-1 text-[10px] px-1.5 py-0.5 ${b.className}`}>
          {b.icon}
          {b.label}
        </Badge>
      ))}
    </div>
  );
}
