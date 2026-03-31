import { useMemo } from "react";
import type { Application } from "@/hooks/hr/useApplications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STAGES = [
  { key: "new", label: "Novo", color: "border-t-blue-500" },
  { key: "screening", label: "Triagem", color: "border-t-amber-500" },
  { key: "interview", label: "Entrevista", color: "border-t-purple-500" },
  { key: "test", label: "Teste", color: "border-t-cyan-500" },
  { key: "offer", label: "Oferta", color: "border-t-emerald-500" },
  { key: "hired", label: "Contratado", color: "border-t-green-600" },
  { key: "rejected", label: "Rejeitado", color: "border-t-red-500" },
];

interface CandidateKanbanProps {
  applications: Application[];
  isLoading: boolean;
  onStageChange: (applicationId: string, newStage: string) => void;
}

export function CandidateKanban({ applications, isLoading, onStageChange }: CandidateKanbanProps) {
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const map: Record<string, Application[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const app of applications) {
      if (map[app.stage]) map[app.stage].push(app);
      else map.new.push(app);
    }
    return map;
  }, [applications]);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(s => (
          <div key={s.key} className="min-w-[280px] flex-shrink-0">
            <Card className="animate-pulse h-64" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map(stage => (
        <div
          key={stage.key}
          className="min-w-[280px] w-[280px] flex-shrink-0"
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary/30"); }}
          onDragLeave={e => { e.currentTarget.classList.remove("ring-2", "ring-primary/30"); }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.classList.remove("ring-2", "ring-primary/30");
            const appId = e.dataTransfer.getData("application-id");
            if (appId) onStageChange(appId, stage.key);
          }}
        >
          <Card className={`border-t-4 ${stage.color} rounded-t-none`}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                <Badge variant="secondary" className="text-xs">{grouped[stage.key].length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2 min-h-[200px] max-h-[60vh] overflow-y-auto">
              {grouped[stage.key].map(app => {
                const initials = app.candidate?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                return (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData("application-id", app.id); e.currentTarget.classList.add("opacity-50"); }}
                    onDragEnd={e => { e.currentTarget.classList.remove("opacity-50"); }}
                    className="p-3 bg-background border rounded-lg cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                    onClick={() => app.candidate?.id && navigate(`/dashboard/hr/recruitment/candidates/${app.candidate.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{app.candidate?.full_name || "Candidato"}</p>
                        <p className="text-xs text-muted-foreground truncate">{app.candidate?.email || ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {app.rating ? (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < app.rating! ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      ) : <span />}
                      {app.ai_score != null && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">IA {app.ai_score}%</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
