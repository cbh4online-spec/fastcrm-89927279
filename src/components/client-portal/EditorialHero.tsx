import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Sparkles, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorialHeroCTA {
  label: string;
  to: string;
  icon?: "sparkles" | "graduation" | "arrow";
  variant?: "primary" | "outline";
}

interface EditorialHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryCta?: EditorialHeroCTA;
  secondaryCta?: EditorialHeroCTA;
  className?: string;
}

const ICONS = {
  sparkles: Sparkles,
  graduation: GraduationCap,
  arrow: ArrowUpRight,
};

function CTAButton({ cta }: { cta: EditorialHeroCTA }) {
  const Icon = cta.icon ? ICONS[cta.icon] : ArrowUpRight;
  const isPrimary = (cta.variant ?? "primary") === "primary";
  return (
    <Button
      asChild
      size="lg"
      className={cn(
        "rounded-full px-6 group",
        isPrimary
          ? "bg-[hsl(var(--editorial-ink))] text-[hsl(var(--editorial-cream))] hover:bg-[hsl(var(--editorial-ink))]/90"
          : "bg-transparent border border-[hsl(var(--editorial-ink))]/30 text-[hsl(var(--editorial-ink))] hover:bg-[hsl(var(--editorial-ink))]/5"
      )}
      variant={isPrimary ? "default" : "outline"}
    >
      <Link to={cta.to}>
        <Icon className="h-4 w-4 mr-2" />
        {cta.label}
        <ArrowUpRight className="h-4 w-4 ml-1 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
      </Link>
    </Button>
  );
}

export function EditorialHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  className,
}: EditorialHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[hsl(var(--editorial-border))]/40",
        "bg-gradient-to-br from-[hsl(var(--editorial-cream))] via-[hsl(var(--editorial-nude))]/40 to-[hsl(var(--editorial-cream))]",
        "px-5 py-10 sm:px-8 sm:py-12 md:px-12 md:py-16 lg:py-20",
        className
      )}
      aria-labelledby="editorial-hero-title"
    >
      {/* Decorative elements */}
      <div
        aria-hidden
        className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[hsl(var(--editorial-accent))]/15 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[hsl(var(--editorial-nude))]/40 blur-3xl"
      />

      <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div className="space-y-6 max-w-2xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[hsl(var(--editorial-accent))] font-medium">
              <span className="h-px w-8 bg-[hsl(var(--editorial-accent))]" />
              {eyebrow}
            </span>
          )}
          <h1
            id="editorial-hero-title"
            className="font-editorial text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-[hsl(var(--editorial-ink))] tracking-tight"
          >
            {title}
          </h1>
          {description && (
            <p className="text-base md:text-lg text-[hsl(var(--editorial-ink))]/70 leading-relaxed max-w-xl">
              {description}
            </p>
          )}
          {(primaryCta || secondaryCta) && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {primaryCta && <CTAButton cta={primaryCta} />}
              {secondaryCta && <CTAButton cta={{ variant: "outline", ...secondaryCta }} />}
            </div>
          )}
        </div>

        {/* Visual side panel */}
        <div className="hidden lg:flex flex-col gap-3" aria-hidden>
          <div className="rounded-2xl border border-[hsl(var(--editorial-border))]/50 bg-[hsl(var(--editorial-cream))]/80 backdrop-blur p-5">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--editorial-accent))]" />
              <span className="text-xs uppercase tracking-wider text-[hsl(var(--editorial-ink))]/60">
                Campanha em destaque
              </span>
            </div>
            <p className="font-editorial text-xl text-[hsl(var(--editorial-ink))] leading-snug">
              Coleções sazonais com condições exclusivas para profissionais.
            </p>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--editorial-border))]/50 bg-[hsl(var(--editorial-ink))] p-5 text-[hsl(var(--editorial-cream))]">
            <div className="flex items-center gap-3 mb-2">
              <GraduationCap className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider opacity-70">
                Academia profissional
              </span>
            </div>
            <p className="font-editorial text-xl leading-snug">
              Formações certificadas para a sua equipa evoluir.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
