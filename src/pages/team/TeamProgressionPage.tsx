import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Trophy, Crown, Medal, Sparkles, Award, BookOpen, Target } from "lucide-react";
import { useWorkspaceLeaderboard, getLevelInfo } from "@/hooks/useUserProgression";
import { UserProgressionWidget } from "@/components/onboarding/UserProgressionWidget";
import { cn } from "@/lib/utils";

export default function TeamProgressionPage() {
  const { data: leaderboard = [], isLoading } = useWorkspaceLeaderboard();

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Progressão da equipa</h1>
            <p className="text-muted-foreground mt-1">
              Acompanha a evolução de cada membro através dos guias de módulo, quizzes e badges conquistadas.
            </p>
          </div>
          <UserProgressionWidget variant="full" className="w-full md:w-[340px]" />
        </header>

        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList>
            <TabsTrigger value="ranking">
              <Trophy className="w-4 h-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="podium">
              <Crown className="w-4 h-4 mr-2" />
              Pódio
            </TabsTrigger>
            <TabsTrigger value="stats">
              <Sparkles className="w-4 h-4 mr-2" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="podium" className="space-y-6">
            {top3.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {top3.map((entry, i) => (
                  <PodiumCard key={entry.user_id} entry={entry} position={i + 1} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ranking" className="space-y-3">
            {isLoading && <p className="text-muted-foreground">A carregar...</p>}
            {!isLoading && leaderboard.length === 0 && <EmptyState />}
            {leaderboard.map((entry) => (
              <LeaderboardRow key={entry.user_id} entry={entry} />
            ))}
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Sparkles className="w-5 h-5" />}
                label="XP total da equipa"
                value={leaderboard.reduce((s, e) => s + e.total_xp, 0).toLocaleString("pt-PT")}
              />
              <StatCard
                icon={<BookOpen className="w-5 h-5" />}
                label="Módulos completos"
                value={leaderboard.reduce((s, e) => s + e.modules_completed, 0)}
              />
              <StatCard
                icon={<Target className="w-5 h-5" />}
                label="Quizzes aprovados"
                value={leaderboard.reduce((s, e) => s + e.quizzes_passed, 0)}
              />
              <StatCard
                icon={<Award className="w-5 h-5" />}
                label="Badges conquistadas"
                value={leaderboard.reduce((s, e) => s + e.badges_earned, 0)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground">Ainda sem progressão</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Quando a tua equipa começar a completar módulos, o ranking aparece aqui.
      </p>
    </Card>
  );
}

function PodiumCard({ entry, position }: { entry: any; position: number }) {
  const { progressPct } = getLevelInfo(entry.total_xp, entry.current_level);
  const colors = [
    "from-yellow-400 to-yellow-600 text-yellow-50",
    "from-slate-300 to-slate-500 text-slate-50",
    "from-amber-600 to-amber-800 text-amber-50",
  ];
  const icons = [Crown, Medal, Award];
  const Icon = icons[position - 1];
  return (
    <Card className={cn("p-6 relative overflow-hidden", position === 1 && "md:scale-105 md:shadow-lg ring-2 ring-primary/20")}>
      <div className={cn("absolute top-0 right-0 px-3 py-1.5 rounded-bl-xl bg-gradient-to-br", colors[position - 1])}>
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <Icon className="w-3.5 h-3.5" />
          {position}º lugar
        </div>
      </div>
      <div className="flex flex-col items-center text-center space-y-3 pt-2">
        <Avatar className="w-20 h-20 ring-4 ring-primary/10">
          <AvatarImage src={entry.avatar_url ?? undefined} />
          <AvatarFallback>{(entry.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{entry.full_name ?? "Sem nome"}</p>
          <p className="text-sm text-muted-foreground">Nível {entry.current_level} · {entry.total_xp.toLocaleString("pt-PT")} XP</p>
        </div>
        <Progress value={progressPct} className="h-1.5 w-full" />
        <div className="grid grid-cols-3 gap-2 w-full text-xs text-muted-foreground">
          <span>{entry.modules_completed} módulos</span>
          <span>{entry.quizzes_passed} quizzes</span>
          <span>{entry.badges_earned} badges</span>
        </div>
      </div>
    </Card>
  );
}

function LeaderboardRow({ entry }: { entry: any }) {
  const { progressPct, isMax } = getLevelInfo(entry.total_xp, entry.current_level);
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className="w-10 text-center font-bold text-muted-foreground tabular-nums">#{entry.rank}</div>
      <Avatar className="w-10 h-10">
        <AvatarImage src={entry.avatar_url ?? undefined} />
        <AvatarFallback>{(entry.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground truncate">{entry.full_name ?? "Sem nome"}</p>
          <span className="text-xs text-muted-foreground">{entry.total_xp.toLocaleString("pt-PT")} XP</span>
        </div>
        <Progress value={progressPct} className="h-1.5 mt-1.5" />
      </div>
      <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          {entry.modules_completed}
        </span>
        <span className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          {entry.quizzes_passed}
        </span>
        <span className="flex items-center gap-1">
          <Award className="w-3 h-3" />
          {entry.badges_earned}
        </span>
      </div>
      <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold tabular-nums">
        Lvl {entry.current_level}
        {isMax && " ★"}
      </div>
    </Card>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="text-primary">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
    </Card>
  );
}
