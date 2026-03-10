import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Json } from "@/integrations/supabase/types";

interface FunnelStep {
  id: string;
  name: string;
  step_type: string;
  sort_order: number;
  content: Json | null;
}

interface StepContent {
  headline?: string;
  subheadline?: string;
  body?: string;
  cta_text?: string;
  cta_url?: string;
  image_url?: string;
}

function parseContent(content: Json | null): StepContent {
  if (!content || typeof content !== "object" || Array.isArray(content)) return {};
  return content as unknown as StepContent;
}

const STEP_TYPE_ICONS: Record<string, string> = {
  page: "🏠",
  optin: "📋",
  checkout: "💳",
  thankyou: "✅",
  upsell: "🚀",
};

export default function PublicFunnelPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [funnel, setFunnel] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!slug) { setError("Funil não encontrado"); setLoading(false); return; }

      let query = supabase.from("funnels").select("id, name, slug").eq("slug", slug);
      if (!isPreview) query = query.eq("is_published", true);
      const { data: f, error: fErr } = await query.single();

      if (fErr || !f) { setError("Funil não encontrado ou não publicado"); setLoading(false); return; }

      setFunnel(f);

      const { data: s } = await supabase
        .from("funnel_steps")
        .select("id, name, step_type, sort_order, content")
        .eq("funnel_id", f.id)
        .order("sort_order", { ascending: true });

      setSteps(s || []);

      const stepParam = searchParams.get("step");
      if (stepParam) setCurrentStepIndex(Math.max(0, parseInt(stepParam, 10)));

      setLoading(false);
    }
    load();
  }, [slug, isPreview, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-2">Funil não encontrado</h1>
        <p className="text-muted-foreground">{error || "Este funil não existe ou não está publicado."}</p>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-2">{funnel.name}</h1>
        <p className="text-muted-foreground">Este funil ainda não tem steps configurados.</p>
      </div>
    );
  }

  const step = steps[currentStepIndex];
  const content = parseContent(step.content);
  const isLast = currentStepIndex >= steps.length - 1;
  const isFirst = currentStepIndex === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
          ⚡ Modo Preview — Esta página não está visível publicamente
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentStepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step type badge */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">{STEP_TYPE_ICONS[step.step_type] || "📄"}</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {step.name}
          </span>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {content.headline ? (
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {content.headline}
            </h1>
          ) : (
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {step.name}
            </h1>
          )}

          {content.subheadline && (
            <p className="text-lg text-muted-foreground">{content.subheadline}</p>
          )}

          {content.image_url && (
            <img
              src={content.image_url}
              alt={content.headline || step.name}
              className="w-full rounded-xl object-cover max-h-96"
            />
          )}

          {content.body && (
            <div className="prose prose-sm max-w-none text-foreground/80">
              <p>{content.body}</p>
            </div>
          )}

          {/* No content placeholder */}
          {!content.headline && !content.subheadline && !content.body && (
            <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
              <p className="text-sm">Este step ainda não tem conteúdo configurado.</p>
              <p className="text-xs mt-1">Edita o step no builder para adicionar headline, texto e CTA.</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12">
          {!isFirst ? (
            <Button
              variant="ghost"
              onClick={() => setCurrentStepIndex((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
          ) : (
            <div />
          )}

          {content.cta_url ? (
            <Button asChild size="lg">
              <a href={content.cta_url} target="_blank" rel="noopener noreferrer">
                {content.cta_text || "Continuar"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          ) : !isLast ? (
            <Button
              size="lg"
              onClick={() => setCurrentStepIndex((i) => i + 1)}
            >
              {content.cta_text || "Continuar"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button size="lg" disabled={!content.cta_text}>
              {content.cta_text || "Concluído ✅"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
