import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Calendar, Radio, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import type { Livestream } from "@/hooks/c2c/useLivestreams";
import { motion } from "framer-motion";

interface Props {
  livestream: Livestream;
}

export function LivestreamCard({ livestream }: Props) {
  const navigate = useNavigate();
  const isLive = livestream.status === "live";

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card
        className="cursor-pointer overflow-hidden group hover:shadow-lg transition-shadow border-0"
        onClick={() => navigate(`/dashboard/marketplace/lives/${livestream.id}`)}
      >
        {/* Thumbnail / Preview */}
        <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {livestream.thumbnail_url ? (
            <img
              src={livestream.thumbnail_url}
              alt={livestream.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <Radio className="h-12 w-12 text-primary/40" />
            </div>
          )}

          {/* Live badge */}
          {isLive && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-red-600 text-white border-0 gap-1.5 px-2.5 py-1 font-bold text-xs animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full inline-block" />
                AO VIVO
              </Badge>
            </div>
          )}

          {/* Scheduled badge */}
          {livestream.status === "scheduled" && livestream.scheduled_at && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(livestream.scheduled_at), { addSuffix: true, locale: pt })}
              </Badge>
            </div>
          )}

          {/* Viewer count */}
          {isLive && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="secondary" className="bg-black/60 text-white border-0 gap-1 text-xs backdrop-blur-sm">
                <Eye className="h-3 w-3" />
                {livestream.viewer_count}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 flex-shrink-0">
              {livestream.seller_avatar && <AvatarImage src={livestream.seller_avatar} />}
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
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
                <Badge variant="outline" className="mt-2 text-[10px] px-1.5 py-0">
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
