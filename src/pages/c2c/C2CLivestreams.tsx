import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, Plus, Calendar, Eye, Video } from "lucide-react";
import { useLivestreams } from "@/hooks/c2c/useLivestreams";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { LivestreamCard } from "@/components/c2c/livestream/LivestreamCard";
import { GoLiveModal } from "@/components/c2c/livestream/GoLiveModal";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function C2CLivestreams() {
  const { currentWorkspace } = useWorkspace();
  const { data: lives = [], isLoading } = useLivestreams(currentWorkspace?.id);
  const [showGoLive, setShowGoLive] = useState(false);

  const livesNow = lives.filter((l) => l.status === "live");
  const scheduled = lives.filter((l) => l.status === "scheduled");

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
              className="bg-white text-red-600 hover:bg-white/90 gap-2 font-bold"
            >
              <Plus className="h-4 w-4" />
              Iniciar Live
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
