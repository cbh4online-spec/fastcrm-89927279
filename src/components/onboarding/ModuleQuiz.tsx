import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Trophy, RotateCcw, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/hooks/useModuleOnboarding";

interface Props {
  questions: QuizQuestion[];
  minScorePercent: number;
  xpReward: number;
  isSubmitting: boolean;
  onSubmit: (answers: number[]) => Promise<{
    score_percent: number;
    passed: boolean;
    correct_answers: number;
    total_questions: number;
    xp_awarded: number;
    progression?: { leveled_up: boolean; current_level: number };
  } | null>;
  onPassed: () => void;
  onRetry: () => void;
}

export function ModuleQuiz({ questions, minScorePercent, xpReward, isSubmitting, onSubmit, onPassed, onRetry }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => Array(questions.length).fill(-1));
  const [result, setResult] = useState<Awaited<ReturnType<typeof onSubmit>> | null>(null);

  const total = questions.length;
  const q = questions[index];
  const isLast = index === total - 1;
  const allAnswered = answers.every((a) => a >= 0);

  const setAnswer = (optIdx: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optIdx;
      return next;
    });
  };

  const submit = async () => {
    const r = await onSubmit(answers);
    setResult(r);
    if (r?.passed) {
      // Defer to allow user to read result
      setTimeout(onPassed, 2500);
    }
  };

  const restart = () => {
    setAnswers(Array(questions.length).fill(-1));
    setIndex(0);
    setResult(null);
    onRetry();
  };

  // Result screen
  if (result) {
    const passed = result.passed;
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center space-y-6">
          <div
            className={cn(
              "mx-auto w-20 h-20 rounded-full flex items-center justify-center",
              passed ? "bg-emerald-500/10" : "bg-destructive/10",
            )}
          >
            {passed ? (
              <Trophy className="w-10 h-10 text-emerald-500" />
            ) : (
              <XCircle className="w-10 h-10 text-destructive" />
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">
              {passed ? "Parabéns!" : "Quase lá"}
            </h3>
            <p className="text-muted-foreground">
              Acertaste {result.correct_answers} de {result.total_questions} ({result.score_percent}%)
            </p>
            <p className="text-sm text-muted-foreground">
              Pontuação mínima: <strong>{minScorePercent}%</strong>
            </p>
          </div>

          {passed && result.xp_awarded > 0 && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                <Sparkles className="w-5 h-5" />
                +{result.xp_awarded} XP
              </div>
              {result.progression?.leveled_up && (
                <p className="text-sm mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  🎉 Subiste para o nível {result.progression.current_level}!
                </p>
              )}
            </div>
          )}

          {!passed && (
            <Button onClick={restart} className="w-full" size="lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Rever apresentação e tentar novamente
            </Button>
          )}

          {passed && <p className="text-sm text-muted-foreground">A libertar acesso ao módulo...</p>}
        </Card>
      </div>
    );
  }

  if (!q) return null;

  const progressPct = ((index + 1) / total) * 100;
  const selected = answers[index];

  return (
    <div className="flex flex-col flex-1">
      <div className="px-6 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quiz · Pergunta {index + 1} de {total}
          </span>
          <span className="text-xs text-muted-foreground">
            Mínimo {minScorePercent}% para passar · +{xpReward} XP
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full p-8 space-y-6">
          <h3 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">
            {q.question}
          </h3>

          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  onClick={() => setAnswer(i)}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-all flex items-center gap-3",
                    isSelected
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:border-primary/40 hover:bg-muted/50 text-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30",
                    )}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                  </div>
                  <span className="text-sm md:text-base">{opt}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="border-t border-border px-6 py-4 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0 || isSubmitting}
        >
          Anterior
        </Button>

        <div className="flex items-center gap-1.5">
          {questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-8 bg-primary" : answers[i] >= 0 ? "w-2 bg-primary/50" : "w-2 bg-muted",
              )}
            />
          ))}
        </div>

        {isLast ? (
          <Button onClick={submit} disabled={!allAnswered || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trophy className="w-4 h-4 mr-2" />
            )}
            Submeter
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} disabled={selected < 0}>
            Seguinte
          </Button>
        )}
      </div>
    </div>
  );
}
