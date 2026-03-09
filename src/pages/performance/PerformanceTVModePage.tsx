import { useState, useEffect } from "react";
import { useLeaderboard } from "@/hooks/usePerformanceScores";
import { usePerformanceChallenges } from "@/hooks/usePerformanceChallenges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Calendar, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SLIDES = ["leaderboard", "revenue", "challenges", "activity"] as const;

export default function PerformanceTVModePage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { data: leaderboard } = useLeaderboard("score_total", "weekly");
  const { data: challenges } = usePerformanceChallenges("active");

  // Auto-cycle every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(s => (s + 1) % SLIDES.length);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

  const slide = SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-background text-foreground p-8 relative">
      {/* Exit button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 left-4 opacity-30 hover:opacity-100 transition-opacity"
        onClick={() => navigate("/dashboard/performance")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Sair
      </Button>

      {/* Slide indicators */}
      <div className="absolute top-4 right-4 flex gap-2">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors cursor-pointer ${
              i === currentSlide ? "bg-primary" : "bg-muted"
            }`}
            onClick={() => setCurrentSlide(i)}
          />
        ))}
      </div>

      <div className="max-w-5xl mx-auto pt-8">
        {/* LEADERBOARD SLIDE */}
        {slide === "leaderboard" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <h1 className="text-5xl font-black tracking-tight">LEADERBOARD</h1>
              <p className="text-xl text-muted-foreground mt-2">Performance Semanal</p>
            </div>
            <div className="space-y-4 max-w-3xl mx-auto">
              {(leaderboard || []).slice(0, 8).map((entry: any) => (
                <div key={entry.id} className="flex items-center gap-6 p-4 rounded-xl bg-muted/20">
                  <span className={`text-4xl font-black ${
                    entry.rank === 1 ? "text-yellow-500" :
                    entry.rank === 2 ? "text-gray-400" :
                    entry.rank === 3 ? "text-orange-500" :
                    "text-muted-foreground"
                  }`}>
                    #{entry.rank}
                  </span>
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={entry.avatar_url} />
                    <AvatarFallback className="text-xl">{entry.user_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{entry.user_name}</p>
                    <p className="text-lg text-muted-foreground">{formatCurrency(entry.revenue_generated)} receita</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black">{Math.round(entry.score_total)}</p>
                    <p className="text-sm text-muted-foreground">pontos</p>
                  </div>
                </div>
              ))}
              {!leaderboard?.length && (
                <p className="text-center text-2xl text-muted-foreground py-16">Sem dados de performance</p>
              )}
            </div>
          </div>
        )}

        {/* REVENUE SLIDE */}
        {slide === "revenue" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <TrendingUp className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h1 className="text-5xl font-black tracking-tight">RECEITA</h1>
              <p className="text-xl text-muted-foreground mt-2">Performance Hoje</p>
            </div>
            <div className="text-center py-12">
              <p className="text-8xl font-black text-green-500">
                {formatCurrency(leaderboard?.reduce((s: number, e: any) => s + e.revenue_generated, 0) || 0)}
              </p>
              <p className="text-2xl text-muted-foreground mt-4">Receita Total Fechada</p>
            </div>
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center p-6 rounded-xl bg-muted/20">
                <p className="text-4xl font-bold">{leaderboard?.reduce((s: number, e: any) => s + e.meetings_booked, 0) || 0}</p>
                <p className="text-muted-foreground mt-1">Reuniões</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-muted/20">
                <p className="text-4xl font-bold">{leaderboard?.reduce((s: number, e: any) => s + e.proposals_sent, 0) || 0}</p>
                <p className="text-muted-foreground mt-1">Propostas</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-muted/20">
                <p className="text-4xl font-bold">{leaderboard?.reduce((s: number, e: any) => s + e.leads_generated, 0) || 0}</p>
                <p className="text-muted-foreground mt-1">Leads</p>
              </div>
            </div>
          </div>
        )}

        {/* CHALLENGES SLIDE */}
        {slide === "challenges" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <Zap className="h-16 w-16 mx-auto text-amber-500 mb-4" />
              <h1 className="text-5xl font-black tracking-tight">DESAFIOS ATIVOS</h1>
            </div>
            <div className="space-y-6 max-w-3xl mx-auto">
              {(challenges || []).slice(0, 4).map(ch => {
                const daysLeft = Math.max(0, Math.ceil((new Date(ch.end_date).getTime() - Date.now()) / 86400000));
                return (
                  <div key={ch.id} className="p-6 rounded-xl bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold">{ch.challenge_name}</p>
                      <span className="text-xl font-mono text-amber-500">{daysLeft}d</span>
                    </div>
                    <p className="text-lg text-muted-foreground">{ch.description}</p>
                  </div>
                );
              })}
              {!challenges?.length && (
                <p className="text-center text-2xl text-muted-foreground py-16">Sem desafios ativos</p>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY SLIDE */}
        {slide === "activity" && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <Calendar className="h-16 w-16 mx-auto text-blue-500 mb-4" />
              <h1 className="text-5xl font-black tracking-tight">TOP ATIVIDADE</h1>
              <p className="text-xl text-muted-foreground mt-2">Quem está a trabalhar mais</p>
            </div>
            <div className="space-y-4 max-w-3xl mx-auto">
              {(leaderboard || []).slice(0, 5).map((entry: any) => (
                <div key={entry.id} className="flex items-center gap-6 p-4 rounded-xl bg-muted/20">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={entry.avatar_url} />
                    <AvatarFallback className="text-lg">{entry.user_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-xl font-bold">{entry.user_name}</p>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold">{entry.meetings_booked}</p>
                      <p className="text-xs text-muted-foreground">Reuniões</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{entry.proposals_sent}</p>
                      <p className="text-xs text-muted-foreground">Propostas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{entry.leads_generated}</p>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        {new Date().toLocaleString("pt-PT")}
      </div>
    </div>
  );
}
