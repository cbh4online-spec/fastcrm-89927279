import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, CheckCircle2, Circle, ExternalLink, Loader2, Trophy, Zap,
} from "lucide-react";
import { toast } from "sonner";

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DesafioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // Fetch challenges
  const { data: challenges = [], isLoading: loadingChallenges } = useQuery({
    queryKey: ["fastclub-challenges", currentWorkspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fastclub_challenges")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("day_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace,
  });

  // Fetch user progress
  const { data: progress = [] } = useQuery({
    queryKey: ["fastclub-challenge-progress", currentWorkspace?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fastclub_challenge_progress")
        .select("challenge_id, completed_at")
        .eq("workspace_id", currentWorkspace!.id)
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentWorkspace && !!user,
  });

  const completedIds = new Set(progress.map((p) => p.challenge_id));
  const completedCount = completedIds.size;
  const progressPct = challenges.length > 0 ? Math.round((completedCount / challenges.length) * 100) : 0;

  // Mark complete mutation
  const markComplete = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase.from("fastclub_challenge_progress").insert({
        workspace_id: currentWorkspace!.id,
        user_id: user!.id,
        challenge_id: challengeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fastclub-challenge-progress"] });
      toast.success("Missão concluída!");
    },
    onError: () => toast.error("Erro ao registar progresso."),
  });

  if (loadingChallenges) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const allDone = completedCount === challenges.length && challenges.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <div className="relative container mx-auto px-4 pt-6 pb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/fastclub")}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div {...stagger} transition={{ delay: 0.05 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 mb-3">
              Ativação FastCRM
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              Desafio 7 Dias
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">
              Complete micro-missões diárias para dominar o FastCRM e desbloquear todo o seu potencial.
            </p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* Progress bar */}
        <motion.div {...stagger} transition={{ delay: 0.1 }} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">
              {allDone ? "Desafio Completo!" : `Dia ${completedCount + 1} de ${challenges.length}`}
            </span>
            <span className="text-muted-foreground">{progressPct}% concluído</span>
          </div>
          <Progress value={progressPct} className="h-3" />
        </motion.div>

        {/* Completion banner */}
        {allDone && (
          <motion.div {...stagger} transition={{ delay: 0.15 }} className="rounded-2xl border bg-primary/5 p-6 text-center space-y-3">
            <Trophy className="w-10 h-10 text-primary mx-auto" />
            <h3 className="text-lg font-bold text-foreground">Parabéns!</h3>
            <p className="text-sm text-muted-foreground">
              Completou todas as missões do Desafio 7 Dias. O seu FastCRM está operacional.
            </p>
          </motion.div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {challenges.map((challenge, i) => {
              const isCompleted = completedIds.has(challenge.id);
              const isAvailable = i <= completedCount;

              return (
                <motion.div
                  key={challenge.id}
                  {...stagger}
                  transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 200 }}
                >
                  <div className="relative flex items-start gap-4 pl-2">
                    {/* Circle indicator */}
                    <div className="relative z-10 flex-shrink-0 mt-1">
                      {isCompleted ? (
                        <CheckCircle2 className="w-8 h-8 text-primary" />
                      ) : (
                        <Circle className={`w-8 h-8 ${isAvailable ? "text-primary/50" : "text-muted-foreground/30"}`} />
                      )}
                    </div>

                    {/* Card */}
                    <Card className={`flex-1 transition-all ${isCompleted ? "border-primary/30 bg-primary/5" : isAvailable ? "border-border" : "border-border/50 opacity-60"}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Dia {challenge.day_number}
                              </span>
                              {isCompleted && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Concluído</Badge>
                              )}
                            </div>
                            <h4 className="font-semibold text-foreground">{challenge.title}</h4>
                            {challenge.description && (
                              <p className="text-sm text-muted-foreground">{challenge.description}</p>
                            )}
                          </div>
                        </div>

                        {isAvailable && !isCompleted && (
                          <div className="flex items-center gap-2 mt-4">
                            {challenge.action_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(challenge.action_url!)}
                                className="gap-1.5"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {challenge.action_label || "Abrir"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => markComplete.mutate(challenge.id)}
                              disabled={markComplete.isPending}
                              className="gap-1.5"
                            >
                              {markComplete.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              Marcar como concluído
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <motion.section {...stagger} transition={{ delay: 0.7 }} className="rounded-2xl border bg-muted/30 p-8 text-center space-y-4">
          <Zap className="w-8 h-8 text-primary mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Precisa de ajuda?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Explore o Método PARE para compreender a lógica por trás de cada missão.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard/fastclub/metodo-pare")} className="gap-2">
            Ver Método PARE
          </Button>
        </motion.section>
      </main>
    </div>
  );
}
