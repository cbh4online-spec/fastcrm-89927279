import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { usePerformanceChallenges, PerformanceChallenge } from "@/hooks/usePerformanceChallenges";
import { ChallengeFormDialog } from "@/components/performance/ChallengeFormDialog";
import { ChallengeDetailSheet } from "@/components/performance/ChallengeDetailSheet";
import { Zap, Plus, Clock, Trophy, Users, Target, DollarSign, CalendarCheck, TrendingUp, Handshake, Gift, Pause, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  revenue_sprint: { icon: DollarSign, label: "Revenue Sprint", color: "text-green-600 bg-green-500/10" },
  meeting_sprint: { icon: CalendarCheck, label: "Meeting Sprint", color: "text-blue-600 bg-blue-500/10" },
  pipeline_builder: { icon: TrendingUp, label: "Pipeline Builder", color: "text-purple-600 bg-purple-500/10" },
  deal_closer: { icon: Handshake, label: "Deal Closer", color: "text-orange-600 bg-orange-500/10" },
};

const statusBadge: Record<string, { label: string; className: string }> = {
  active: { label: "Ativo", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  paused: { label: "Pausado", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  completed: { label: "Concluído", className: "bg-muted text-muted-foreground border-border" },
};

export default function PerformanceChallengesPage() {
  const { data: challenges, isLoading } = usePerformanceChallenges();
  const [tab, setTab] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [editChallenge, setEditChallenge] = useState<PerformanceChallenge | null>(null);
  const [detailChallenge, setDetailChallenge] = useState<PerformanceChallenge | null>(null);

  const all = challenges || [];
  const active = useMemo(() => all.filter(c => c.status === "active"), [all]);
  const completed = useMemo(() => all.filter(c => c.status === "completed"), [all]);
  const paused = useMemo(() => all.filter(c => c.status === "paused"), [all]);

  const filtered = tab === "active" ? [...active, ...paused] : tab === "completed" ? completed : all;

  // KPIs
  const highestTarget = active.length ? Math.max(...active.map(c => c.target_value)) : 0;
  const completionRate = all.length ? Math.round((completed.length / all.length) * 100) : 0;

  const handleEdit = (ch: PerformanceChallenge) => {
    setEditChallenge(ch);
    setShowForm(true);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Desafios de Vendas" description="Competições e sprints para impulsionar resultados" />
          <Button onClick={() => { setEditChallenge(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Desafio
          </Button>
        </div>

        {/* KPIs */}
        <KPIGrid columns={4}>
          <KPICard title="Desafios Ativos" value={active.length} icon={<Zap className="h-4 w-4" />} variant="primary" />
          <KPICard title="Pausados" value={paused.length} icon={<Pause className="h-4 w-4" />} variant="warning" />
          <KPICard title="Maior Meta" value={highestTarget > 0 ? highestTarget.toLocaleString() : "—"} icon={<Target className="h-4 w-4" />} variant="success" />
          <KPICard title="Taxa Conclusão" value={`${completionRate}%`} icon={<Trophy className="h-4 w-4" />} variant="default" />
        </KPIGrid>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">Ativos ({active.length + paused.length})</TabsTrigger>
            <TabsTrigger value="completed">Concluídos ({completed.length})</TabsTrigger>
            <TabsTrigger value="all">Todos ({all.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Challenge Cards */}
        {!filtered.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Zap className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum desafio {tab === "active" ? "ativo" : tab === "completed" ? "concluído" : ""}</p>
              <Button variant="outline" className="mt-4" onClick={() => { setEditChallenge(null); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Criar primeiro desafio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(ch => <ChallengeCard key={ch.id} challenge={ch} onClick={() => setDetailChallenge(ch)} />)}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <ChallengeFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        editChallenge={editChallenge}
      />

      {/* Detail Sheet */}
      <ChallengeDetailSheet
        challenge={detailChallenge}
        open={!!detailChallenge}
        onOpenChange={open => { if (!open) setDetailChallenge(null); }}
        onEdit={handleEdit}
      />
    </DashboardLayout>
  );
}

function ChallengeCard({ challenge, onClick }: { challenge: PerformanceChallenge; onClick: () => void }) {
  const tc = typeConfig[challenge.challenge_type] || typeConfig.revenue_sprint;
  const sb = statusBadge[challenge.status] || statusBadge.active;
  const TypeIcon = tc.icon;

  const daysTotal = Math.ceil((new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime()) / 86400000);
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000));
  const timeProgress = daysTotal > 0 ? Math.round(((daysTotal - daysLeft) / daysTotal) * 100) : 0;

  return (
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all group",
        challenge.status === "completed" && "opacity-70"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("p-2 rounded-lg shrink-0", tc.color)}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{challenge.challenge_name}</CardTitle>
              <p className="text-xs text-muted-foreground">{tc.label}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[10px] shrink-0", sb.className)}>{sb.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {challenge.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{challenge.description}</p>
        )}

        {/* Time bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {daysLeft}d restantes</span>
            <span>{timeProgress}%</span>
          </div>
          <Progress value={timeProgress} className="h-1.5" />
        </div>

        {/* Meta + Reward */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-medium">
            <Trophy className="h-3 w-3 text-amber-500" /> Meta: {challenge.target_value.toLocaleString()}
          </span>
          {challenge.reward_type && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Gift className="h-2.5 w-2.5" />
              {challenge.reward_type === "bonus" ? "Bónus" : challenge.reward_type === "prize" ? "Prémio" : "Reconhecimento"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
