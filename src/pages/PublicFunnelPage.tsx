import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { Loader2, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FunnelStepForm, type FormFieldConfig } from "@/components/funnels/FunnelStepForm";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";
import {
  ThankYouRenderer, CountdownRenderer, BookingRenderer,
  UpsellRenderer, DownsellRenderer, BridgeRenderer,
} from "@/components/funnels/step-renderers";
import type { Json } from "@/integrations/supabase/types";

interface FunnelData {
  id: string;
  name: string;
  slug: string;
  workspace_id?: string;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  noindex?: boolean;
  consent_required?: boolean;
  consent_text?: string;
  consent_text_version?: string;
  privacy_policy_url?: string;
  marketing_opt_in_enabled?: boolean;
  marketing_opt_in_label?: string;
}

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
  page: "🏠", optin: "📋", checkout: "💳", thankyou: "✅", upsell: "🚀",
  testimonials: "⭐", video: "🎬", downsell: "📉", order_bump: "🎁",
  squeeze: "🔒", webinar: "🎥", sales_letter: "📝", application: "📄",
  booking: "📅", bridge: "🌉", countdown: "⏰", tripwire: "⚡",
  membership: "🔑", custom: "🧩",
};

function ImageGallery({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  if (images.length === 0) return null;
  if (images.length === 1) return <img src={images[0]} alt="" className="w-full rounded-xl object-cover max-h-96" />;
  return (
    <div className="relative">
      <img src={images[current]} alt="" className="w-full rounded-xl object-cover max-h-96" />
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <button onClick={() => setCurrent(i => (i - 1 + images.length) % images.length)} className="h-8 w-8 rounded-full bg-background/80 flex items-center justify-center shadow hover:bg-background transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => setCurrent(i => (i + 1) % images.length)} className="h-8 w-8 rounded-full bg-background/80 flex items-center justify-center shadow hover:bg-background transition">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`} />
        ))}
      </div>
    </div>
  );
}

export default function PublicFunnelPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const tracking = useFunnelTracking(
    funnel ? { workspace_id: funnel.workspace_id || "", funnel_id: funnel.id } : null
  );

  useEffect(() => {
    async function load() {
      if (!slug) { setError("Funil não encontrado"); setLoading(false); return; }
      let query = supabase.from("funnels").select("id, name, slug, workspace_id, seo_title, seo_description, og_image_url, canonical_url, noindex, consent_required, consent_text, consent_text_version, privacy_policy_url, marketing_opt_in_enabled, marketing_opt_in_label").eq("slug", slug);
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

  // Track step_view + legacy stats + step_abandoned
  useEffect(() => {
    if (!funnel?.workspace_id || steps.length === 0) return;
    const step = steps[currentStepIndex];
    if (!step) return;
    tracking.trackStepView(step.id);
    tracking.setCurrentStep(step.id);
    // Legacy dual-write
    const today = new Date().toISOString().split("T")[0];
    supabase.from("funnel_step_stats").insert({
      step_id: step.id, workspace_id: funnel.workspace_id, event_type: "page_view", event_date: today, count: 1,
    }).then(() => {});
  }, [funnel, steps, currentStepIndex]);

  useEffect(() => {
    setFormSubmitted(false);
  }, [currentStepIndex]);

  const handleFormSubmit = async (formData: Record<string, unknown>) => {
    if (!funnel || !steps[currentStepIndex]) throw new Error("No funnel");
    const step = steps[currentStepIndex];
    const content = parseContent(step.content);
    const utms = new URLSearchParams(window.location.search);

    const consentGiven = !!(formData.__consent || formData.consent);
    const marketingOptIn = !!(formData.__marketing_opt_in || formData.marketing_opt_in);

    // Clean internal fields
    const cleanData = { ...formData };
    delete cleanData.__consent;
    delete cleanData.__marketing_opt_in;
    delete cleanData.__hp;

    const submissionId = crypto.randomUUID();

    // Insert submission
    const { error: subErr } = await supabase.from("funnel_submissions").insert({
      id: submissionId,
      funnel_id: funnel.id,
      step_id: step.id,
      workspace_id: funnel.workspace_id,
      data: cleanData,
      source_url: window.location.href,
      consent_given: consentGiven,
      consent_timestamp: consentGiven ? new Date().toISOString() : null,
      consent_text_version: funnel.consent_text_version || null,
      marketing_opt_in: marketingOptIn,
      utm_source: utms.get("utm_source") || null,
      utm_medium: utms.get("utm_medium") || null,
      utm_campaign: utms.get("utm_campaign") || null,
      referrer: document.referrer || null,
      device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
      session_id: tracking.sessionId,
    });

    if (subErr) throw subErr;

    // Track events
    tracking.trackFormSuccess(step.id);

    // Legacy optin stats
    if (funnel.workspace_id) {
      const today = new Date().toISOString().split("T")[0];
      supabase.from("funnel_step_stats").insert({
        step_id: step.id, workspace_id: funnel.workspace_id, event_type: "optin", event_date: today, count: 1,
      }).then(() => {});
    }

    // CRM lead capture via edge function
    const fields = content.form_fields || [];
    const emailField = fields.find(f => f.type === "email");
    const nameField = fields.find(f => f.type === "text" || f.label?.toLowerCase().includes("nome"));
    const recipientEmail = emailField ? String(cleanData[emailField.id] || "").trim() : null;
    const recipientName = nameField ? String(cleanData[nameField.id] || "").trim() : undefined;

    if (recipientEmail) {
      supabase.functions.invoke("funnel-lead-capture", {
        body: {
          workspace_id: funnel.workspace_id,
          funnel_id: funnel.id,
          step_id: step.id,
          submission_id: submissionId,
          name: recipientName,
          email: recipientEmail,
          consent_given: consentGiven,
          marketing_opt_in: marketingOptIn,
          utm_source: utms.get("utm_source"),
          utm_medium: utms.get("utm_medium"),
          utm_campaign: utms.get("utm_campaign"),
          slug: funnel.slug,
          step_type: step.step_type,
        },
      }).then((res: any) => {
        if (res.data?.contact_id) {
          tracking.setContactId(res.data.contact_id);
        }
      }).catch(console.error);

      // Transactional emails
      const templateData = { name: recipientName, funnelName: funnel.name };
      supabase.functions.invoke("send-transactional-email", {
        body: { templateName: "funnel-registration-thanks", recipientEmail, idempotencyKey: `funnel-thanks-${submissionId}`, templateData },
      }).catch(console.error);

      supabase.functions.invoke("send-transactional-email", {
        body: { templateName: "funnel-meeting-trial-invite", recipientEmail, idempotencyKey: `funnel-meeting-${submissionId}`, templateData },
      }).catch(console.error);

      // Nurture queue
      supabase.from("funnel_nurture_queue").insert({
        submission_id: submissionId, funnel_id: funnel.id, workspace_id: funnel.workspace_id,
        recipient_email: recipientEmail, recipient_name: recipientName || null,
        funnel_name: funnel.name, current_step: 0, status: "pending",
      }).then(() => {});
    }

    setFormSubmitted(true);
    const isLast = currentStepIndex >= steps.length - 1;
    if (isLast) {
      tracking.trackFunnelCompleted();
    } else {
      tracking.trackStepCompleted(step.id);
      setTimeout(() => setCurrentStepIndex(i => i + 1), 1500);
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
  const hasForm = (step.step_type === "optin" || step.step_type === "application" || step.step_type === "squeeze") && content.form_fields && content.form_fields.length > 0;
  const stepImages = getImages(content);

  // Step types with dedicated renderers
  const DEDICATED_TYPES = ["thankyou", "countdown", "booking", "upsell", "downsell", "bridge"];

  const seoTitle = funnel.seo_title || funnel.name;
  const seoDescription = funnel.seo_description || `${funnel.name} — ${step.name}`;

  return (
    <div className="min-h-screen bg-background">
      {/* SEO */}
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        {funnel.og_image_url && <meta property="og:image" content={funnel.og_image_url} />}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        {funnel.canonical_url && <link rel="canonical" href={funnel.canonical_url} />}
        {funnel.noindex && <meta name="robots" content="noindex, nofollow" />}
      </Helmet>

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

          {/* Testimonials */}
          {step.step_type === "testimonials" && content.testimonials && content.testimonials.length > 0 && (
            <div className="space-y-4">
              {content.testimonials.map((t) => (
                <div key={t.id} className="border rounded-xl p-5 bg-muted/20 space-y-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= t.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`} />
                    ))}
                  </div>
                  <p className="text-sm italic text-foreground/80">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{t.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Video */}
          {(step.step_type === "video" || step.step_type === "webinar") && content.video?.url && (
            <div className="space-y-3">
              {content.video.caption && (
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Play className="h-4 w-4" /> {content.video.caption}
                </p>
              )}
              <div className="rounded-xl overflow-hidden border">
                {content.video.url.includes("youtube.com") || content.video.url.includes("youtu.be") ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${content.video.url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1] || ""}${content.video.autoplay ? "?autoplay=1" : ""}${content.video.muted ? "&mute=1" : ""}${content.video.loop ? "&loop=1" : ""}`}
                    className="w-full aspect-video" allowFullScreen allow="autoplay; encrypted-media"
                  />
                ) : content.video.url.includes("vimeo.com") ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${content.video.url.match(/vimeo\.com\/(\d+)/)?.[1] || ""}${content.video.autoplay ? "?autoplay=1" : ""}${content.video.muted ? "&muted=1" : ""}`}
                    className="w-full aspect-video" allowFullScreen
                  />
                ) : (
                  <video src={content.video.url} controls autoPlay={content.video.autoplay} loop={content.video.loop} muted={content.video.muted} poster={content.video.poster_url} className="w-full aspect-video" />
                )}
              </div>
            </div>
          )}

          {/* Form - now using FunnelStepForm */}
          {hasForm && (
            <FunnelStepForm
              fields={content.form_fields!}
              ctaText={content.cta_text}
              ctaColor={content.cta_color}
              consentRequired={funnel.consent_required}
              consentText={funnel.consent_text}
              privacyPolicyUrl={funnel.privacy_policy_url}
              marketingOptInEnabled={funnel.marketing_opt_in_enabled}
              marketingOptInLabel={funnel.marketing_opt_in_label}
              onSubmit={handleFormSubmit}
              onFormStarted={() => tracking.trackFormStarted(step.id)}
              submitted={formSubmitted}
            />
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
              <Button variant="ghost" onClick={() => { tracking.trackStepCompleted(step.id); setCurrentStepIndex(i => i - 1); }}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
            ) : <div />}
            {content.cta_url ? (
              <Button asChild size="lg" onClick={() => tracking.trackCtaClicked(step.id, content.cta_text)}>
                <a href={content.cta_url} target="_blank" rel="noopener noreferrer">
                  {content.cta_text || "Continuar"} <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            ) : !isLast ? (
              <Button size="lg" onClick={() => { tracking.trackCtaClicked(step.id, content.cta_text); tracking.trackStepCompleted(step.id); setCurrentStepIndex(i => i + 1); }}>
                {content.cta_text || "Continuar"} <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button size="lg" onClick={() => tracking.trackFunnelCompleted()} disabled={!content.cta_text}>
                {content.cta_text || "Concluído ✅"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
