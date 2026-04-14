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
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
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
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="Lives"
        description="Assiste a lives de vendedores, descobre produtos em tempo real e interage no chat."
        count={lives.length}
        actions={[
          {
            label: "Live Rápida",
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setShowGoLive(true),
          },
          {
            label: "Configurar Live",
            icon: <Settings2 className="h-4 w-4" />,
            onClick: () => navigate("/dashboard/marketplace/lives/setup"),
            variant: "outline",
          },
        ]}
      >
        {livesNow.length > 0 && (
          <Badge variant="destructive" className="gap-1.5 text-xs py-1 px-2.5">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {livesNow.length} ao vivo
          </Badge>
        )}
      </PageHeader>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Video className="h-4 w-4" />
            Todas
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Ao Vivo
            {livesNow.length > 0 && (
              <Badge variant="destructive" className="border-0 text-[10px] px-1.5 ml-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {lives.map((live) => (
        <LivestreamCard key={live.id} livestream={live} />
      ))}
    </div>
  );
}
