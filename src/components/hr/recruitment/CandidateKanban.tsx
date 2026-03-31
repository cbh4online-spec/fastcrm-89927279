import { useMemo } from "react";
import type { Candidate, CandidateStage } from "@/hooks/hr/useCandidates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STAGES: { key: CandidateStage; label: string; color: string }[] = [
  { key: "new", label: "Novo", color: "border-t-blue-500" },
  { key: "screening", label: "Triagem", color: "border-t-amber-500" },
  { key: "phone_interview", label: "Telefone", color: "border-t-purple-500" },
  { key: "technical_interview", label: "Técnica", color: "border-t-cyan-500" },
  { key: "onsite_interview", label: "Presencial", color: "border-t-indigo-500" },
  { key: "offer", label: "Oferta", color: "border-t-emerald-500" },
  { key: "hired", label: "Contratado", color: "border-t-green-600" },
  { key: "rejected", label: "Rejeitado", color: "border-t-red-500" },
];

interface CandidateKanbanProps {
  candidates: Candidate[];
  isLoading: boolean;
  onStageChange: (candidateId: string, newStage: CandidateStage) => void;
}

export function CandidateKanban({ candidates, isLoading, onStageChange }: CandidateKanbanProps) {
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const map: Record<string, Candidate[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const c of candidates) {
      if (map[c.stage]) map[c.stage].push(c);
      else map.new.push(c);
    }
    return map;
  }, [candidates]);

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(s => (
          <div key={s.key} className="min-w-[260px] flex-shrink-0">
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
          className="min-w-[260px] w-[260px] flex-shrink-0"
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary/30"); }}
          onDragLeave={e => { e.currentTarget.classList.remove("ring-2", "ring-primary/30"); }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.classList.remove("ring-2", "ring-primary/30");
            const candidateId = e.dataTransfer.getData("candidate-id");
            if (candidateId) onStageChange(candidateId, stage.key);
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
              {grouped[stage.key].map(c => {
                const initials = `${c.first_name?.[0] || ""}${c.last_name?.[0] || ""}`.toUpperCase() || "?";
                return (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData("candidate-id", c.id); e.currentTarget.classList.add("opacity-50"); }}
                    onDragEnd={e => { e.currentTarget.classList.remove("opacity-50"); }}
                    className="p-3 bg-background border rounded-lg cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow"
                    onClick={() => navigate(`/dashboard/hr/recruitment/candidates/${c.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                    </div>
                    {c.ai_score != null && (
                      <div className="flex items-center gap-1 mt-2">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">IA {c.ai_score}%</Badge>
                      </div>
                    )}
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
