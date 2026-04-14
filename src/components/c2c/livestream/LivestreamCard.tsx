import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Calendar, Radio, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { Livestream } from "@/hooks/c2c/useLivestreams";
import { motion } from "framer-motion";
import { LiveBadge } from "./LiveBadge";
import { cn } from "@/lib/utils";

interface Props {
  livestream: Livestream;
}

export function LivestreamCard({ livestream }: Props) {
  const navigate = useNavigate();
  const isLive = livestream.status === "live";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card
        className={cn(
          "cursor-pointer overflow-hidden group transition-all duration-300 border-0",
          isLive
            ? "ring-2 ring-amber-500/30 hover:ring-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 live-glow-amber"
            : "hover:shadow-lg"
        )}
        onClick={() => navigate(`/dashboard/marketplace/lives/${livestream.id}`)}
      >
        {/* Thumbnail / Preview */}
        <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {livestream.thumbnail_url ? (
            <img
              src={livestream.thumbnail_url}
              alt={livestream.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          ) : (
            <div className={cn(
              "w-full h-full flex items-center justify-center",
              isLive
                ? "bg-gradient-to-br from-amber-500/20 via-red-500/10 to-orange-500/20"
                : "bg-gradient-to-br from-primary/20 to-primary/5"
            )}>
              <Radio className={cn(
                "h-12 w-12",
                isLive ? "text-amber-500/50" : "text-primary/40"
              )} />
            </div>
          )}

          {/* Overlay gradient for live */}
          {isLive && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          )}

          {/* Live badge */}
          {isLive && (
            <div className="absolute top-3 left-3">
              <LiveBadge size="md" />
            </div>
          )}

          {/* Scheduled badge */}
          {livestream.status === "scheduled" && livestream.scheduled_at && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(livestream.scheduled_at), { addSuffix: true, locale: pt })}
              </Badge>
            </div>
          )}

          {/* Ended/replay badge */}
          {livestream.status === "ended" && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                <PlayCircle className="h-3 w-3" />
                Gravação
              </Badge>
            </div>
          )}

          {/* Viewer count */}
          {isLive && (
            <div className="absolute bottom-3 right-3">
              <Badge className="bg-black/60 text-white border-0 gap-1 text-xs backdrop-blur-sm">
                <Eye className="h-3 w-3" />
                {livestream.viewer_count}
              </Badge>
            </div>
          )}
          {livestream.status === "ended" && livestream.total_views > 0 && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="secondary" className="gap-1 text-xs">
                <Eye className="h-3 w-3" />
                {livestream.total_views} visualizações
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className={cn(
              "h-9 w-9 flex-shrink-0 transition-all",
              isLive && "ring-2 ring-amber-500/40"
            )}>
              {livestream.seller_avatar && <AvatarImage src={livestream.seller_avatar} />}
              <AvatarFallback className={cn(
                "text-xs font-bold",
                isLive
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-primary/10 text-primary"
              )}>
                {(livestream.seller_name || "V")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground">
                {livestream.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {livestream.seller_name || "Vendedor"}
              </p>
              {livestream.category && (
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-2 text-[10px] px-1.5 py-0",
                    isLive && "border-amber-500/30 text-amber-600 bg-amber-500/5"
                  )}
                >
                  {livestream.category}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
