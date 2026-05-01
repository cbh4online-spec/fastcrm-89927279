import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles, GraduationCap, PackageOpen, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useActivePartnerSlides,
  type PartnerPortalSlide,
  PARTNER_SLIDE_KIND_ACCENT,
} from "@/hooks/usePartnerPortalSlides";

interface PartnerHeroCarouselProps {
  workspaceId?: string | null;
  /** Slides estáticos de fallback, mostrados quando não existem registos na BD. */
  fallback?: PartnerPortalSlide[];
}

const KIND_ICON = {
  campaign: Sparkles,
  training: GraduationCap,
  launch: PackageOpen,
  education: BookOpen,
} as const;

/**
 * Carrossel hero de estilo editorial (beige/champanhe + serifa display).
 * Faz auto-rotate a cada 7s, pausa em hover.
 */
export function PartnerHeroCarousel({ workspaceId, fallback = [] }: PartnerHeroCarouselProps) {
  const { data: dbSlides = [], isLoading } = useActivePartnerSlides(workspaceId);
  const slides = dbSlides.length > 0 ? dbSlides : fallback;

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Reset idx if slides change length
  useEffect(() => {
    setIdx((prev) => (prev >= slides.length ? 0 : prev));
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  if (isLoading && slides.length === 0) {
    return (
      <div className="relative h-[340px] sm:h-[420px] rounded-2xl overflow-hidden bg-[hsl(var(--editorial-cream))] animate-pulse" />
    );
  }

  if (slides.length === 0) return null;

  const current = slides[idx];
  const Icon = KIND_ICON[current.kind] ?? Sparkles;

  const goTo = (n: number) => setIdx((n + slides.length) % slides.length);

  return (
    <div
      className="relative h-[340px] sm:h-[420px] rounded-2xl overflow-hidden shadow-2xl shadow-[hsl(var(--editorial-shadow))] group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Imagem de fundo */}
      <div className="absolute inset-0">
        {current.image_url ? (
          <img
            src={current.image_url}
            alt=""
            className="w-full h-full object-cover transition-opacity duration-700"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--editorial-cream))] via-[hsl(var(--editorial-champagne))] to-[hsl(var(--editorial-rose))]" />
        )}
        {/* Overlay editorial — gradiente claro para legibilidade do texto à esquerda */}
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--editorial-overlay))]/95 via-[hsl(var(--editorial-overlay))]/70 to-transparent" />
      </div>

      {/* Conteúdo */}
      <div className="relative h-full flex items-center">
        <div className="px-8 sm:px-14 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--editorial-accent))] font-medium">
            <Icon className="h-3.5 w-3.5" />
            <span>{current.eyebrow || PARTNER_SLIDE_KIND_ACCENT[current.kind]}</span>
          </div>
          <h2 className="font-editorial text-4xl sm:text-5xl leading-[1.05] tracking-tight text-[hsl(var(--editorial-ink))]">
            {current.title}
          </h2>
          {current.subtitle && (
            <p className="text-base sm:text-lg text-[hsl(var(--editorial-ink))]/85 font-light max-w-xl">
              {current.subtitle}
            </p>
          )}
          {current.description && (
            <p className="text-sm text-[hsl(var(--editorial-ink))]/65 max-w-lg leading-relaxed">
              {current.description}
            </p>
          )}
          {current.cta_label && current.cta_url && (
            <div className="pt-2">
              {current.cta_url.startsWith("http") ? (
                <a href={current.cta_url} target="_blank" rel="noreferrer">
                  <Button
                    size="lg"
                    className="bg-[hsl(var(--editorial-ink))] text-[hsl(var(--editorial-cream))] hover:bg-[hsl(var(--editorial-ink))]/90 rounded-full px-7"
                  >
                    {current.cta_label}
                  </Button>
                </a>
              ) : (
                <Link to={current.cta_url}>
                  <Button
                    size="lg"
                    className="bg-[hsl(var(--editorial-ink))] text-[hsl(var(--editorial-cream))] hover:bg-[hsl(var(--editorial-ink))]/90 rounded-full px-7"
                  >
                    {current.cta_label}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navegação */}
      {slides.length > 1 && (
        <>
          <button
            onClick={() => goTo(idx - 1)}
            aria-label="Slide anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/70 backdrop-blur hover:bg-white text-[hsl(var(--editorial-ink))] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo(idx + 1)}
            aria-label="Próximo slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/70 backdrop-blur hover:bg-white text-[hsl(var(--editorial-ink))] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Indicadores */}
          <div className="absolute bottom-5 left-8 sm:left-14 flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === idx
                    ? "w-10 bg-[hsl(var(--editorial-ink))]"
                    : "w-5 bg-[hsl(var(--editorial-ink))]/30 hover:bg-[hsl(var(--editorial-ink))]/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
