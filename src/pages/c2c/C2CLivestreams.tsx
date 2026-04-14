import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, Plus, Calendar, Eye, Video, PlayCircle, Settings2 } from "lucide-react";
import { useLivestreams } from "@/hooks/c2c/useLivestreams";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LivestreamCard } from "@/components/c2c/livestream/LivestreamCard";
import { GoLiveModal } from "@/components/c2c/livestream/GoLiveModal";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { DEMO_LIVESTREAMS } from "@/data/c2c/demoLivestreams";

export default function C2CLivestreams() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { data: dbLives = [], isLoading } = useLivestreams(currentWorkspace?.id);
  const lives = dbLives.length > 0 ? dbLives : DEMO_LIVESTREAMS;
  const [showGoLive, setShowGoLive] = useState(false);

  const livesNow = lives.filter((l) => l.status === "live");
  const scheduled = lives.filter((l) => l.status === "scheduled");
  const ended = lives.filter((l) => l.status === "ended");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-br from-red-600 via-amber-600 to-orange-500 relative overflow-hidden">
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
            <Badge className="bg-amber-500/25 text-amber-100 border border-amber-400/30 mb-3 gap-1.5 backdrop-blur-sm">
              <Radio className="h-3 w-3" />
              LiveStreaming
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Lives do Marketplace
            </h1>
            <p className="text-white/70 mt-2 max-w-xl text-base">
              Assiste a lives de vendedores, descobre produtos em tempo real e interage no chat.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex flex-wrap gap-3"
          >
            <Button
              onClick={() => setShowGoLive(true)}
              className="bg-red-600 text-white hover:bg-red-700 gap-2 font-bold"
            >
              <Plus className="h-4 w-4" />
              Live Rápida
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/marketplace/lives/setup")}
              className="gap-2 border-white/30 text-white hover:bg-white/10"
            >
              <Settings2 className="h-4 w-4" />
              Configurar Live
            </Button>
            {livesNow.length > 0 && (
              <Badge className="bg-white/20 text-white border-0 gap-1.5 text-sm py-1.5 px-3">
                <span className="w-2 h-2 bg-red-300 rounded-full animate-pulse" />
                {livesNow.length} ao vivo agora
              </Badge>
            )}
          </motion.div>
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
              {ended.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 ml-1">
                  {ended.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <LiveGrid lives={lives} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="live">
            <LiveGrid lives={livesNow} isLoading={isLoading} emptyText="Nenhuma live ao vivo neste momento." />
          </TabsContent>
          <TabsContent value="scheduled">
            <LiveGrid lives={scheduled} isLoading={isLoading} emptyText="Nenhuma live agendada." />
          </TabsContent>
          <TabsContent value="ended">
            <LiveGrid lives={ended} isLoading={isLoading} emptyText="Nenhuma gravação disponível ainda." />
          </TabsContent>
        </Tabs>
      </div>

      <GoLiveModal open={showGoLive} onOpenChange={setShowGoLive} />
    </div>
  );
}

function LiveGrid({
  lives,
  isLoading,
  emptyText = "Nenhuma live encontrada.",
}: {
  lives: any[];
  isLoading: boolean;
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
        <LivestreamCard key={live.id} livestream={live} />
      ))}
    </div>
  );
}
