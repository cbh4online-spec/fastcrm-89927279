import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2, SkipForward, Loader2 } from "lucide-react";
import type { ModuleOnboardingSlide } from "@/hooks/useModuleOnboarding";

interface Props {
  moduleName: string;
  slides: ModuleOnboardingSlide[];
  onComplete: (payload: { slidesViewed: number; totalSlides: number; durationSeconds: number; skipped?: boolean }) => Promise<void> | void;
  onClose?: () => void;
  reviewMode?: boolean;
  isSuperAdmin?: boolean;
  isSubmitting?: boolean;
}

export function ModulePresentationViewer({
  moduleName,
  slides,
  onComplete,
  onClose,
  reviewMode = false,
  isSuperAdmin = false,
  isSubmitting = false,
}: Props) {
  const [index, setIndex] = useState(0);
  const [secondsOnSlide, setSecondsOnSlide] = useState(0);
  const startedAtRef = useRef<number>(Date.now());
  const viewedRef = useRef<Set<number>>(new Set([0]));

  const total = slides.length;
  const slide = slides[index];
  const isLast = index === total - 1;
  const minDuration = slide?.min_duration_seconds ?? 3;
  const canAdvance = reviewMode || secondsOnSlide >= minDuration;

  useEffect(() => {
    setSecondsOnSlide(0);
    viewedRef.current.add(index);
    const timer = setInterval(() => setSecondsOnSlide((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [index]);

  const goNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      handleComplete(false);
    } else {
      setIndex((i) => Math.min(i + 1, total - 1));
    }
  };
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  const handleComplete = async (skipped: boolean) => {
    const durationSeconds = Math.round((Date.now() - startedAtRef.current) / 1000);
    await onComplete({
      slidesViewed: viewedRef.current.size,
      totalSlides: total,
      durationSeconds,
      skipped,
    });
    onClose?.();
  };

  const progressPct = useMemo(() => ((index + 1) / Math.max(total, 1)) * 100, [index, total]);

  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {reviewMode ? "Guia do módulo" : "Bem-vindo"}
          </p>
          <h2 className="text-lg font-semibold text-foreground">{moduleName}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{index + 1} / {total}</span>
          {(reviewMode || isSuperAdmin) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (reviewMode ? onClose?.() : handleComplete(true))}
              disabled={isSubmitting}
            >
              <SkipForward className="w-4 h-4 mr-1" />
              {reviewMode ? "Fechar" : "Saltar"}
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      <Progress value={progressPct} className="h-1 rounded-none" />

      {/* Slide */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        <Card className="max-w-3xl w-full p-8 md:p-12 space-y-6 shadow-lg">
          {slide.image_url && (
            <div className="rounded-lg overflow-hidden bg-muted aspect-video">
              <img src={slide.image_url} alt={slide.heading} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground">{slide.heading}</h3>
            {slide.body && (
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{slide.body}</p>
            )}
          </div>

          {Array.isArray(slide.bullets) && slide.bullets.length > 0 && (
            <ul className="space-y-2.5">
              {slide.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{b}</span>
                </li>
              ))}
            </ul>
          )}

          {!canAdvance && !reviewMode && (
            <p className="text-xs text-muted-foreground italic">
              A ler... ({Math.max(0, minDuration - secondsOnSlide)}s)
            </p>
          )}
        </Card>
      </div>

      {/* Footer */}
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
          {isLast ? (slide.cta_label || "Concluir") : "Seguinte"}
          {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
