import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Calendar, Target, Trophy, TrendingUp, Loader2 } from "lucide-react";
import { useDuoPartnerVisions } from "@/hooks/useVisionDuo";
import { useVisionSprints, useVisionBriefings, useVisionWins } from "@/hooks/useVision";
import { useState } from "react";

function PartnerVisionDetail({ vision }: { vision: any }) {
  const { data: sprints = [] } = useVisionSprints(vision.id);
  const { data: briefings = [] } = useVisionBriefings(vision.id);
  const { data: wins = [] } = useVisionWins(vision.id);

  const activeSprint = sprints.find((s) => s.status === "active");
  const recentBriefings = briefings.slice(0, 5);
  const recentWins = wins.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Active Sprint */}
      {activeSprint && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-violet-500" />Sprint Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm font-semibold text-foreground">{activeSprint.title}</p>
            {activeSprint.goal && <p className="text-xs text-muted-foreground mt-1">{activeSprint.goal}</p>}
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">
                {activeSprint.start_date} → {activeSprint.end_date}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Briefings */}
      {recentBriefings.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-violet-500" />Briefings Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentBriefings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <div>
                    <p className="text-xs font-medium text-foreground">{b.date}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Energia: {b.energy_level}/5
                    </p>
                  </div>
                  <Badge variant={b.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                    {b.status === "completed" ? "✅" : "⏳"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Wins */}
      {recentWins.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />Vitórias Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentWins.map((w) => (
                <div key={w.id} className="p-2 rounded bg-muted/30">
                  <p className="text-xs font-medium text-foreground">{w.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{w.category || "geral"}</Badge>
                    <span className="text-[10px] text-muted-foreground">{w.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!activeSprint && recentBriefings.length === 0 && recentWins.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Ainda sem atividade registada.</p>
      )}
    </div>
  );
}

export function VisionDuoPartnerView() {
  const { data: partnerVisions = [], isLoading } = useDuoPartnerVisions();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (partnerVisions.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Eye className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Ainda não és parceiro(a) de nenhuma visão.</p>
        <p className="text-xs text-muted-foreground">Quando alguém te convidar, verás o progresso aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-500" />Visões dos Parceiros
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Acompanha o progresso dos teus parceiros de accountability.</p>
      </div>

      {partnerVisions.map((link: any) => {
        const vision = link.vision_profiles;
        if (!vision) return null;
        const isExpanded = expandedId === vision.id;

        return (
          <Card
            key={link.id}
            className="border-border/50 cursor-pointer hover:border-violet-500/30 transition-colors"
            onClick={() => setExpandedId(isExpanded ? null : vision.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{vision.title}</p>
                  {vision.objective && <p className="text-xs text-muted-foreground mt-1">{vision.objective}</p>}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {vision.target_date ? `Alvo: ${new Date(vision.target_date).toLocaleDateString("pt-PT")}` : "Sem prazo"}
                </Badge>
              </div>
              {isExpanded && (
                <div className="mt-4 border-t border-border/50 pt-4">
                  <PartnerVisionDetail vision={vision} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
