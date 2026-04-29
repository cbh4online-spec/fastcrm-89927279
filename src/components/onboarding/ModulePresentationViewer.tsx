import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2, SkipForward, Loader2, Maximize2, X, Presentation } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { ModuleQuiz } from "./ModuleQuiz";
import { cn } from "@/lib/utils";
import fastcrmLogo from "@/assets/fastcrm-logo.png";
import fastcrmMark from "@/assets/fastcrm-mark.png";
import type { ModuleOnboardingSlide, QuizQuestion } from "@/hooks/useModuleOnboarding";

interface Props {
  moduleName: string;
  slides: ModuleOnboardingSlide[];
  quiz?: QuizQuestion[];
  minScorePercent?: number;
  xpReward?: number;
  allowLiveMode?: boolean;
  onComplete: (payload: { slidesViewed: number; totalSlides: number; durationSeconds: number; skipped?: boolean }) => Promise<void> | void;
  onSubmitQuiz?: (answers: number[]) => Promise<any>;
  onClose?: () => void;
  reviewMode?: boolean;
  isSuperAdmin?: boolean;
  isSubmitting?: boolean;
  isQuizSubmitting?: boolean;
}

type Phase = "slides" | "quiz" | "done";

export function ModulePresentationViewer({
  moduleName,
  slides,
  quiz = [],
  minScorePercent = 70,
  xpReward = 50,
  allowLiveMode = true,
  onComplete,
  onSubmitQuiz,
  onClose,
  reviewMode = false,
  isSuperAdmin = false,
  isSubmitting = false,
  isQuizSubmitting = false,
}: Props) {
  const { currentWorkspace } = useWorkspace();
  const [phase, setPhase] = useState<Phase>("slides");
  const [index, setIndex] = useState(0);
  const [secondsOnSlide, setSecondsOnSlide] = useState(0);
  const [liveMode, setLiveMode] = useState(false);
  const startedAtRef = useRef<number>(Date.now());
  const viewedRef = useRef<Set<number>>(new Set([0]));

  const total = slides.length;
  const slide = slides[index];
  const isLast = index === total - 1;
  const minDuration = slide?.min_duration_seconds ?? 3;
  const canAdvance = reviewMode || liveMode || secondsOnSlide >= minDuration;
  const hasQuiz = quiz.length > 0;

  useEffect(() => {
    setSecondsOnSlide(0);
    viewedRef.current.add(index);
    const timer = setInterval(() => setSecondsOnSlide((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [index]);

  // Keyboard navigation (live + review modes get full control)
  useEffect(() => {
    if (phase !== "slides") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape" && (reviewMode || liveMode)) {
        onClose?.();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, index, canAdvance, isLast, reviewMode, liveMode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const goNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      handleSlidesEnd();
    } else {
      setIndex((i) => Math.min(i + 1, total - 1));
    }
  };
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  const handleSlidesEnd = async () => {
    if (reviewMode || liveMode) {
      onClose?.();
      return;
    }
    // Register slides completion (XP awarded server-side via hook)
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    try {
      await onComplete({
        slidesViewed: viewedRef.current.size,
        totalSlides: total,
        durationSeconds,
        skipped: false,
      });
    } catch {
      // toast handled by caller
      return;
    }
    if (hasQuiz) {
      setPhase("quiz");
    } else {
      setPhase("done");
      onClose?.();
    }
  };

  const handleSkip = async () => {
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    await onComplete({
      slidesViewed: viewedRef.current.size,
      totalSlides: total,
      durationSeconds,
      skipped: true,
    });
    onClose?.();
  };

  const progressPct = useMemo(() => ((index + 1) / Math.max(total, 1)) * 100, [index, total]);

  if (!slide) return null;

  // ===================== QUIZ PHASE =====================
  if (phase === "quiz" && onSubmitQuiz) {
    return (
      <div className={cn("fixed inset-0 z-[100] flex flex-col", liveMode ? "bg-background" : "bg-background/95 backdrop-blur-sm")}>
        <CoBrandedHeader
          moduleName={moduleName}
          subtitle="Quiz final"
          workspaceName={currentWorkspace?.name}
          workspaceLogo={currentWorkspace?.logo_url}
          liveMode={false}
        />
        <ModuleQuiz
          questions={quiz}
          minScorePercent={minScorePercent}
          xpReward={xpReward}
          isSubmitting={isQuizSubmitting}
          onSubmit={async (answers) => {
            try {
              const r = await onSubmitQuiz(answers);
              return r;
            } catch {
              return null;
            }
          }}
          onPassed={() => onClose?.()}
          onRetry={() => {
            setPhase("slides");
            setIndex(0);
            startedAtRef.current = Date.now();
            viewedRef.current = new Set([0]);
          }}
        />
      </div>
    );
  }

  // ===================== SLIDES PHASE =====================
  return (
    <div className={cn("fixed inset-0 z-[100] flex flex-col", liveMode ? "bg-background" : "bg-background/95 backdrop-blur-sm")}>
      <CoBrandedHeader
        moduleName={moduleName}
        subtitle={liveMode ? "Apresentação ao vivo" : reviewMode ? "Guia do módulo" : "Bem-vindo"}
        workspaceName={currentWorkspace?.name}
        workspaceLogo={currentWorkspace?.logo_url}
        liveMode={liveMode}
        right={
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{index + 1} / {total}</span>
            {allowLiveMode && (reviewMode || isSuperAdmin) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLiveMode((v) => !v);
                  if (!liveMode) toggleFullscreen();
                }}
                title="Modo apresentação ao vivo (F)"
              >
                <Presentation className="w-4 h-4 mr-1" />
                {liveMode ? "Sair" : "Live"}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Ecrã inteiro (F)">
              <Maximize2 className="w-4 h-4" />
            </Button>
            {(reviewMode || liveMode || isSuperAdmin) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (reviewMode || liveMode ? onClose?.() : handleSkip())}
                disabled={isSubmitting}
              >
                {reviewMode || liveMode ? <X className="w-4 h-4 mr-1" /> : <SkipForward className="w-4 h-4 mr-1" />}
                {reviewMode || liveMode ? "Fechar" : "Saltar"}
              </Button>
            )}
          </div>
        }
      />

      <Progress value={progressPct} className="h-1 rounded-none" />

      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        <Card className={cn("w-full p-8 md:p-12 space-y-6 shadow-lg", liveMode ? "max-w-5xl" : "max-w-3xl")}>
          {slide.image_url && (
            <div className="rounded-lg overflow-hidden bg-muted aspect-video">
              <img src={slide.image_url} alt={slide.heading} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-3">
            <h3 className={cn("font-bold text-foreground", liveMode ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl")}>
              {slide.heading}
            </h3>
            {slide.body && (
              <p className={cn("text-muted-foreground leading-relaxed", liveMode ? "text-lg md:text-xl" : "text-base md:text-lg")}>
                {slide.body}
              </p>
            )}
          </div>

          {Array.isArray(slide.bullets) && slide.bullets.length > 0 && (
            <ul className="space-y-2.5">
              {slide.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className={cn("text-primary mt-0.5 flex-shrink-0", liveMode ? "w-6 h-6" : "w-5 h-5")} />
                  <span className={cn("text-foreground", liveMode ? "text-lg" : "")}>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {!canAdvance && !reviewMode && !liveMode && (
            <p className="text-xs text-muted-foreground italic">
              A ler... ({Math.max(0, minDuration - secondsOnSlide)}s)
            </p>
          )}
        </Card>
      </div>

      <div className="border-t border-border px-6 py-4 flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={index === 0 || isSubmitting}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>

        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-8 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/30"
              }`}
              aria-label={`Ir para slide ${i + 1}`}
            />
          ))}
        </div>

        <Button onClick={goNext} disabled={!canAdvance || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : isLast ? (
            <CheckCircle2 className="w-4 h-4 mr-1" />
          ) : null}
          {isLast ? (hasQuiz && !reviewMode && !liveMode ? "Avançar para Quiz" : slide.cta_label || "Concluir") : "Seguinte"}
          {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

// ========== Co-branded header component ==========
function CoBrandedHeader({
  moduleName,
  subtitle,
  workspaceName,
  workspaceLogo,
  liveMode,
  right,
}: {
  moduleName: string;
  subtitle: string;
  workspaceName?: string;
  workspaceLogo?: string | null;
  liveMode: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between px-6 py-4 border-b border-border", liveMode ? "bg-card" : "")}>
      <div className="flex items-center gap-4">
        {/* FastCRM brand */}
        <div className="flex items-center gap-2">
          <img src={fastcrmMark} alt="FastCRM" className="h-7 w-auto" />
          <img src={fastcrmLogo} alt="FastCRM" className="h-5 w-auto hidden sm:block opacity-80" />
        </div>

        {workspaceName && (
          <>
            <div className="h-8 w-px bg-border" />
            {/* Workspace brand */}
            <div className="flex items-center gap-2">
              {workspaceLogo ? (
                <img src={workspaceLogo} alt={workspaceName} className="h-7 w-7 rounded object-cover" />
              ) : (
                <div className="h-7 w-7 rounded bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                  {workspaceName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium text-foreground hidden md:block">{workspaceName}</span>
            </div>
          </>
        )}

        <div className="hidden lg:block">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{subtitle}</p>
          <h2 className="text-base font-semibold text-foreground -mt-0.5">{moduleName}</h2>
        </div>
      </div>

      {right}
    </div>
  );
}
