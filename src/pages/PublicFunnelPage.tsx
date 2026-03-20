import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { Loader2, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Json } from "@/integrations/supabase/types";

interface FunnelStep {
  id: string;
  name: string;
  step_type: string;
  sort_order: number;
  content: Json | null;
}

interface FormFieldConfig {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea";
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface StepContent {
  headline?: string;
  subheadline?: string;
  body?: string;
  cta_text?: string;
  cta_url?: string;
  cta_color?: string;
  image_url?: string;
  images?: string[];
  form_fields?: FormFieldConfig[];
  testimonials?: { id: string; name: string; role: string; quote: string; avatar_url?: string; rating: number }[];
  video?: { url: string; autoplay: boolean; loop: boolean; muted: boolean; poster_url?: string; caption?: string };
}

function parseContent(content: Json | null): StepContent {
  if (!content || typeof content !== "object" || Array.isArray(content)) return {};
  return content as unknown as StepContent;
}

function getImages(content: StepContent): string[] {
  if (content.images?.length) return content.images;
  if (content.image_url) return [content.image_url];
  return [];
}

const STEP_TYPE_ICONS: Record<string, string> = {
  page: "🏠",
  optin: "📋",
  checkout: "💳",
  thankyou: "✅",
  upsell: "🚀",
};

function ImageGallery({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) return null;
  if (images.length === 1) {
    return <img src={images[0]} alt="" className="w-full rounded-xl object-cover max-h-96" />;
  }

  return (
    <div className="relative">
      <img src={images[current]} alt="" className="w-full rounded-xl object-cover max-h-96" />
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <button
          onClick={() => setCurrent(i => (i - 1 + images.length) % images.length)}
          className="h-8 w-8 rounded-full bg-background/80 flex items-center justify-center shadow hover:bg-background transition"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => setCurrent(i => (i + 1) % images.length)}
          className="h-8 w-8 rounded-full bg-background/80 flex items-center justify-center shadow hover:bg-background transition"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function PublicFunnelPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [funnel, setFunnel] = useState<{ id: string; name: string; slug: string; workspace_id?: string } | null>(null);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const trackedSteps = useState<Set<string>>(() => new Set())[0];

  useEffect(() => {
    async function load() {
      if (!slug) { setError("Funil não encontrado"); setLoading(false); return; }
      let query = supabase.from("funnels").select("id, name, slug, workspace_id").eq("slug", slug);
      if (!isPreview) query = query.eq("is_published", true);
      const { data: f, error: fErr } = await query.maybeSingle();
      if (fErr || !f) { setError("Funil não encontrado ou não publicado"); setLoading(false); return; }
      setFunnel(f);
      const { data: s } = await supabase.from("funnel_steps").select("id, name, step_type, sort_order, content").eq("funnel_id", f.id).order("sort_order", { ascending: true });
      setSteps(s || []);
      const stepParam = searchParams.get("step");
      if (stepParam) setCurrentStepIndex(Math.max(0, parseInt(stepParam, 10)));
      setLoading(false);
    }
    load();
  }, [slug, isPreview, searchParams]);

  // Track page_view for each step
  useEffect(() => {
    if (!funnel?.workspace_id || steps.length === 0) return;
    const step = steps[currentStepIndex];
    if (!step || trackedSteps.has(step.id)) return;
    trackedSteps.add(step.id);
    const today = new Date().toISOString().split("T")[0];
    supabase.from("funnel_step_stats").insert({
      step_id: step.id,
      workspace_id: funnel.workspace_id,
      event_type: "page_view",
      event_date: today,
      count: 1,
    }).then(() => {});
  }, [funnel, steps, currentStepIndex, trackedSteps]);

  useEffect(() => {
    setFormData({});
    setFormSubmitted(false);
  }, [currentStepIndex]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funnel || !steps[currentStepIndex]) return;

    const step = steps[currentStepIndex];
    const content = parseContent(step.content);

    const missingFields = (content.form_fields || [])
      .filter(f => f.required && !formData[f.id]?.trim())
      .map(f => f.label);

    if (missingFields.length > 0) return;

    setFormSubmitting(true);
    try {
      const { error } = await supabase.from("funnel_submissions").insert({
        funnel_id: funnel.id,
        step_id: step.id,
        data: formData as unknown as Json,
        source_url: window.location.href,
      });

      if (error) throw error;

      // Track optin event
      if (funnel.workspace_id) {
        const today = new Date().toISOString().split("T")[0];
        supabase.from("funnel_step_stats").insert({
          step_id: step.id,
          workspace_id: funnel.workspace_id,
          event_type: "optin",
          event_date: today,
          count: 1,
        }).then(() => {});
      }

      setFormSubmitted(true);

      const isLast = currentStepIndex >= steps.length - 1;
      if (!isLast) {
        setTimeout(() => setCurrentStepIndex(i => i + 1), 1500);
      }
    } catch (err) {
      console.error("Submission error:", err);
    } finally {
      setFormSubmitting(false);
    }
  };

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
  const hasForm = step.step_type === "optin" && content.form_fields && content.form_fields.length > 0;
  const stepImages = getImages(content);

  return (
    <div className="min-h-screen bg-background">
      {isPreview && (
        <div className="bg-primary text-primary-foreground text-center py-2 text-sm font-medium">
          ⚡ Modo Preview — Esta página não está visível publicamente
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentStepIndex ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">{STEP_TYPE_ICONS[step.step_type] || "📄"}</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{step.name}</span>
        </div>

        <div className="space-y-6">
          {content.headline ? (
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{content.headline}</h1>
          ) : (
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{step.name}</h1>
          )}

          {content.subheadline && <p className="text-lg text-muted-foreground">{content.subheadline}</p>}

          {stepImages.length > 0 && <ImageGallery images={stepImages} />}

          {content.body && (
            <div className="prose prose-sm max-w-none text-foreground/80">
              <p className="whitespace-pre-wrap">{content.body}</p>
            </div>
          )}

          {hasForm && !formSubmitted && (
            <form onSubmit={handleFormSubmit} className="space-y-4 bg-muted/30 border rounded-xl p-6">
              {content.form_fields!.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-sm">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      value={formData[field.id] || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={3}
                    />
                  ) : (
                    <Input
                      type={field.type === "phone" ? "tel" : field.type}
                      value={formData[field.id] || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
              <Button type="submit" className="w-full" size="lg" disabled={formSubmitting}
                style={content.cta_color ? { backgroundColor: content.cta_color } : undefined}>
                {formSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {content.cta_text || "Enviar"}
              </Button>
            </form>
          )}

          {hasForm && formSubmitted && (
            <div className="text-center py-8 space-y-3 bg-muted/30 border rounded-xl p-6">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">Enviado com sucesso!</h3>
              <p className="text-sm text-muted-foreground">Obrigado pelo seu interesse.</p>
            </div>
          )}

          {!content.headline && !content.subheadline && !content.body && !hasForm && stepImages.length === 0 && (
            <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
              <p className="text-sm">Este step ainda não tem conteúdo configurado.</p>
            </div>
          )}
        </div>

        {!hasForm && (
          <div className="flex items-center justify-between mt-12">
            {!isFirst ? (
              <Button variant="ghost" onClick={() => setCurrentStepIndex(i => i - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
            ) : <div />}
            {content.cta_url ? (
              <Button asChild size="lg">
                <a href={content.cta_url} target="_blank" rel="noopener noreferrer">
                  {content.cta_text || "Continuar"} <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            ) : !isLast ? (
              <Button size="lg" onClick={() => setCurrentStepIndex(i => i + 1)}>
                {content.cta_text || "Continuar"} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button size="lg" disabled={!content.cta_text}>
                {content.cta_text || "Concluído ✅"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
