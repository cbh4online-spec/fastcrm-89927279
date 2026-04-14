import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Eye,
  Heart,
  Share2,
  Radio,
  ShoppingBag,
  Users,
  Clock,
} from "lucide-react";
import { useLivestreamById, useEndLive } from "@/hooks/c2c/useLivestreams";
import { SimulatedVideoFeed } from "@/components/c2c/livestream/SimulatedVideoFeed";
import { LiveChat } from "@/components/c2c/livestream/LiveChat";
import { LiveProductShowcase } from "@/components/c2c/livestream/LiveProductShowcase";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function C2CLivestreamViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: live, isLoading } = useLivestreamById(id);
  const endLive = useEndLive();
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const isOwner = userId && live?.seller_id === userId;
  const isLive = live?.status === "live";

  const handleEndLive = async () => {
    if (!live?.id) return;
    try {
      await endLive.mutateAsync(live.id);
      toast.success("Live terminada");
    } catch {
      toast.error("Erro ao terminar a live");
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="aspect-video max-w-4xl mx-auto rounded-xl" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Radio className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground">Live não encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/95">
      {/* Top bar */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/marketplace/lives")}
          className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="flex items-center gap-2">
          {isLive && (
            <Badge className="bg-red-600 text-white border-0 gap-1.5 animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full" />
              AO VIVO
            </Badge>
          )}
          {live.status === "ended" && (
            <Badge variant="secondary">Terminada</Badge>
          )}
          {live.status === "scheduled" && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Agendada
            </Badge>
          )}
        </div>

        {isOwner && isLive && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndLive}
            disabled={endLive.isPending}
          >
            Terminar Live
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-49px)]">
        {/* Video area */}
        <div className="flex-1 flex flex-col">
          {/* Video placeholder */}
          <div className="flex-1 relative bg-black">
            {/* Simulated video feed */}
            <div className="absolute inset-0">
              <SimulatedVideoFeed
                isLive={isLive}
                title={live.title}
                sellerName={live.seller_name}
              />
            </div>

            {/* Scheduled overlay */}
            {live.status === "scheduled" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                <div className="text-center">
                  <Clock className="h-16 w-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">Esta live ainda não começou</p>
                  {live.scheduled_at && (
                    <p className="text-white/40 text-sm mt-2">
                      Agendada para {formatDistanceToNow(new Date(live.scheduled_at), { addSuffix: true, locale: pt })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ended overlay */}
            {live.status === "ended" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                <div className="text-center">
                  <Radio className="h-16 w-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">Esta live já terminou</p>
                </div>
              </div>
            )}

            {/* Floating reactions */}
            {isLive && (
              <div className="absolute bottom-4 left-4 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full ${liked ? "text-red-400 bg-red-400/20" : "text-white/60 hover:text-white bg-white/10"}`}
                  onClick={handleLike}
                >
                  <Heart className={`h-5 w-5 ${liked ? "fill-red-400" : ""}`} />
                  {likeCount > 0 && <span className="ml-1 text-xs">{likeCount}</span>}
                </Button>
                <Button variant="ghost" size="sm" className="rounded-full text-white/60 hover:text-white bg-white/10">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Viewer count overlay */}
            {isLive && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-black/60 text-white border-0 gap-1.5 backdrop-blur-sm">
                  <Eye className="h-3 w-3" />
                  {live.viewer_count} a ver
                </Badge>
              </div>
            )}
          </div>

          {/* Info bar */}
          <div className="bg-gray-900 border-t border-white/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                  {(live.seller_name || "V")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-semibold text-sm truncate">{live.title}</h2>
                <div className="flex items-center gap-3 text-white/50 text-xs">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {live.viewer_count} espectadores
                  </span>
                  {live.category && (
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3" />
                      {live.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="w-full lg:w-[360px] border-l border-white/10 bg-background flex flex-col h-[350px] lg:h-full">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <span className="font-semibold text-sm">Chat ao vivo</span>
            {isLive && (
              <Badge variant="secondary" className="text-[10px]">
                {live.viewer_count} online
              </Badge>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <LiveChat livestreamId={live.id} isLive={isLive} />
          </div>
        </div>
      </div>
    </div>
  );
}
