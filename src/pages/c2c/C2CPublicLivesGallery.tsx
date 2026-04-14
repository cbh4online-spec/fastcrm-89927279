import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, Calendar, Eye, Video, PlayCircle } from "lucide-react";
import { usePublicMarketplaceWorkspace } from "@/hooks/c2c/usePublicMarketplaceWorkspace";
import { usePublicLivestreams, type PublicLivestream } from "@/hooks/c2c/usePublicLivestreams";
import { useIsApprovedSeller } from "@/hooks/c2c/useIsApprovedSeller";
import { AuthProvider } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

function C2CPublicLivesGalleryInner() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const navigate = useNavigate();
  const { data: workspace, isLoading: wsLoading } = usePublicMarketplaceWorkspace(workspaceSlug);
  const { data: lives = [], isLoading } = usePublicLivestreams(workspace?.id);
  const { isSeller, isLoading: sellerLoading } = useIsApprovedSeller(workspace?.id);

  const livesNow = lives.filter((l) => l.status === "live");
  const scheduled = lives.filter((l) => l.status === "scheduled");
  const ended = lives.filter((l) => l.status === "ended");

  if (wsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Marketplace não encontrado.</p>
      </div>
    );
  }

  const handleCardClick = (live: PublicLivestream) => {
    const slug = live.workspace_slug || workspaceSlug;
    navigate(`/marketplace/${slug}/live/${live.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative container mx-auto px-4 pt-8 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Badge className="bg-white/15 text-white border-0 mb-3 gap-1.5">
              <Radio className="h-3 w-3" />
              LiveStreaming
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Lives — {workspace.name}
            </h1>
            <p className="text-white/70 mt-2 max-w-xl text-base">
              Assiste a lives de vendedores, descobre produtos em tempo real e interage no chat.
            </p>

            {/* Go Live button for approved sellers */}
            {!sellerLoading && isSeller && (
              <Button
                onClick={() => navigate(`/marketplace/${workspaceSlug}/go-live`)}
                className="mt-4 bg-white text-red-600 hover:bg-white/90 font-bold gap-2 shadow-lg"
                size="lg"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Ir ao Vivo
              </Button>
            )}
          </motion.div>

          {livesNow.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6"
            >
              <Badge className="bg-white/20 text-white border-0 gap-1.5 text-sm py-1.5 px-3">
                <span className="w-2 h-2 bg-red-300 rounded-full animate-pulse" />
                {livesNow.length} ao vivo agora
              </Badge>
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-1.5">
              <Video className="h-4 w-4" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="live" className="gap-1.5">
              <Eye className="h-4 w-4" />
              Ao Vivo
              {livesNow.length > 0 && (
                <Badge className="bg-red-500 text-white border-0 text-[10px] px-1.5 ml-1">
                  {livesNow.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Agendadas
            </TabsTrigger>
            <TabsTrigger value="ended" className="gap-1.5">
              <PlayCircle className="h-4 w-4" />
              Anteriores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <PublicLiveGrid lives={lives} isLoading={isLoading} onCardClick={handleCardClick} />
          </TabsContent>
          <TabsContent value="live">
            <PublicLiveGrid lives={livesNow} isLoading={isLoading} onCardClick={handleCardClick} emptyText="Nenhuma live ao vivo neste momento." />
          </TabsContent>
          <TabsContent value="scheduled">
            <PublicLiveGrid lives={scheduled} isLoading={isLoading} onCardClick={handleCardClick} emptyText="Nenhuma live agendada." />
          </TabsContent>
          <TabsContent value="ended">
            <PublicLiveGrid lives={ended} isLoading={isLoading} onCardClick={handleCardClick} emptyText="Nenhuma gravação disponível ainda." />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function C2CPublicLivesGallery() {
  return (
    <AuthProvider>
      <C2CPublicLivesGalleryInner />
    </AuthProvider>
  );
}

function PublicLiveGrid({
  lives,
  isLoading,
  onCardClick,
  emptyText = "Nenhuma live encontrada.",
}: {
  lives: PublicLivestream[];
  isLoading: boolean;
  onCardClick: (live: PublicLivestream) => void;
  emptyText?: string;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-video rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (lives.length === 0) {
    return (
      <div className="text-center py-16">
        <Radio className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {lives.map((live) => (
        <PublicLivestreamCard key={live.id} livestream={live} onClick={() => onCardClick(live)} />
      ))}
    </div>
  );
}

function PublicLivestreamCard({ livestream, onClick }: { livestream: PublicLivestream; onClick: () => void }) {
  const isLive = livestream.status === "live";

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Card
        className="cursor-pointer overflow-hidden group hover:shadow-lg transition-shadow border-0"
        onClick={onClick}
      >
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

          {isLive && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-red-600 text-white border-0 gap-1.5 px-2.5 py-1 font-bold text-xs animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full inline-block" />
                AO VIVO
              </Badge>
            </div>
          )}

          {livestream.status === "scheduled" && livestream.scheduled_at && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium">
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(new Date(livestream.scheduled_at), { addSuffix: true, locale: pt })}
              </Badge>
            </div>
          )}

          {livestream.status === "ended" && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-medium">
                <PlayCircle className="h-3 w-3" />
                Gravação
              </Badge>
            </div>
          )}

          {isLive && (
            <div className="absolute bottom-3 right-3">
              <Badge variant="secondary" className="bg-black/60 text-white border-0 gap-1 text-xs backdrop-blur-sm">
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
