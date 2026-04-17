import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Mail, User, Phone, ExternalLink } from "lucide-react";
import { FlipbookReader } from "@/components/ebooks/FlipbookReader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";
import { useEbookCtas } from "@/hooks/useEbookCtas";

interface EbookChapter {
  id: string;
  title: string;
  content: string;
  cover_image?: string;
}

interface EbookContactPage {
  email?: string;
  phone?: string;
  website?: string;
  slogan?: string;
  logo_url?: string;
  social_links?: { label: string; url: string }[];
}

interface EbookData {
  id: string;
  title: string;
  subtitle?: string;
  author_name?: string;
  cover_url?: string;
  chapters: EbookChapter[];
  header_text?: string;
  footer_text?: string;
  contact_page?: EbookContactPage;
  global_styles?: Record<string, unknown>;
  protection_enabled?: boolean;
  lead_gate_enabled?: boolean;
  lead_gate_trigger?: "never" | "always" | "after_pages";
  lead_gate_after_pages?: number;
  lead_gate_require_name?: boolean;
  lead_gate_require_email?: boolean;
  lead_gate_require_phone?: boolean;
  lead_gate_title?: string;
  lead_gate_description?: string;
  lead_gate_cta_label?: string;
  consent_required?: boolean;
  workspace_id: string;
  consent_text?: string;
  privacy_policy_url?: string;
  marketing_opt_in_enabled?: boolean;
  marketing_opt_in_label?: string;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  canonical_url?: string;
  noindex?: boolean;
  slug?: string;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua) && !/tablet/i.test(ua)) return "mobile";
  return "desktop";
}

function getSessionId(): string {
  const key = "ebook_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** Resolve config do gate com defaults retro-compatíveis. */
function resolveGateConfig(eb: EbookData) {
  // Retrocompat: se lead_gate_enabled=true e trigger não definido => "always"
  const trigger: "never" | "always" | "after_pages" =
    eb.lead_gate_trigger ??
    (eb.lead_gate_enabled ? "always" : "never");

  return {
    enabled: trigger !== "never",
    trigger,
    afterPages: Math.max(1, eb.lead_gate_after_pages ?? 2),
    requireName: eb.lead_gate_require_name ?? true,
    requireEmail: eb.lead_gate_require_email ?? true,
    requirePhone: eb.lead_gate_require_phone ?? false,
    title: eb.lead_gate_title?.trim() || eb.title,
    description: eb.lead_gate_description?.trim() || "Insira os seus dados para aceder ao eBook",
    ctaLabel: eb.lead_gate_cta_label?.trim() || "Aceder ao eBook",
  };
}

export default function PublicEbookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [ebook, setEbook] = useState<EbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const [gateOpen, setGateOpen] = useState(false);
  const [gateName, setGateName] = useState("");
  const [gateEmail, setGateEmail] = useState("");
  const [gatePhone, setGatePhone] = useState("");
  const [gateConsent, setGateConsent] = useState(false);
  const [gateMarketingOptIn, setGateMarketingOptIn] = useState(false);
  const [gateSubmitting, setGateSubmitting] = useState(false);

  const { data: ctas = [] } = useEbookCtas(ebook?.id);

  useEffect(() => {
    async function load() {
      if (!slug) { setError("Slug não encontrado"); setLoading(false); return; }
      const { data, error: err } = await (supabase as any)
        .from("ebooks")
        .select("id, title, subtitle, author_name, cover_url, chapters, header_text, footer_text, contact_page, global_styles, protection_enabled, lead_gate_enabled, lead_gate_trigger, lead_gate_after_pages, lead_gate_require_name, lead_gate_require_email, lead_gate_require_phone, lead_gate_title, lead_gate_description, lead_gate_cta_label, consent_required, workspace_id, slug, consent_text, privacy_policy_url, marketing_opt_in_enabled, marketing_opt_in_label, seo_title, seo_description, og_image_url, canonical_url, noindex")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (err) { setError("Erro ao carregar eBook"); setLoading(false); return; }
      if (!data) { setError("eBook não encontrado"); setLoading(false); return; }
      setEbook({ ...data, chapters: Array.isArray(data.chapters) ? data.chapters : [], contact_page: data.contact_page || {} });
      setLoading(false);
    }
    load();
  }, [slug]);

  // Após carregar o ebook: criar view e decidir gate
  useEffect(() => {
    if (!ebook || viewId) return;
    const sessionId = getSessionId();
    const cfg = resolveGateConfig(ebook);
    const gateKey = `ebook_gate_${ebook.id}`;
    const previousGate = localStorage.getItem(gateKey);
    const prev = previousGate ? JSON.parse(previousGate) : {};

    // Cria sempre a view de tracking (anónima ou com dados prévios)
    createView(ebook, sessionId, prev.name, prev.email, prev.phone, false, false);

    // Gate "always" (sem dados prévios) => abrir já
    if (cfg.enabled && cfg.trigger === "always" && !previousGate) {
      setGateOpen(true);
    }
  }, [ebook]);

  // Gatilho "after_pages": abre o gate quando atingir N páginas
  useEffect(() => {
    if (!ebook) return;
    const cfg = resolveGateConfig(ebook);
    if (!cfg.enabled || cfg.trigger !== "after_pages") return;
    const previousGate = localStorage.getItem(`ebook_gate_${ebook.id}`);
    if (previousGate) return;
    if (currentPage + 1 >= cfg.afterPages && !gateOpen) {
      setGateOpen(true);
    }
  }, [currentPage, ebook, gateOpen]);

  async function createView(
    eb: EbookData, sessionId: string,
    name?: string, email?: string, phone?: string,
    consentGiven: boolean = false, marketingOptIn: boolean = false
  ) {
    const totalPages = eb.chapters.reduce((s, ch) => s + Math.max(1, Math.ceil((ch.content?.length || 0) / 800)), 0) + 2;

    const insertPayload: Record<string, unknown> = {
      ebook_id: eb.id,
      workspace_id: eb.workspace_id,
      session_id: sessionId,
      reader_name: name || null,
      reader_email: email || null,
      reader_phone: phone || null,
      referrer: document.referrer || null,
      utm_source: searchParams.get("utm_source") || null,
      utm_medium: searchParams.get("utm_medium") || null,
      utm_campaign: searchParams.get("utm_campaign") || null,
      device_type: getDeviceType(),
      total_pages: totalPages,
      consent_given: consentGiven,
      consent_text_version: consentGiven && eb.consent_text ? simpleHash(eb.consent_text) : null,
      marketing_opt_in: marketingOptIn,
      consent_timestamp: consentGiven ? new Date().toISOString() : null,
      user_agent_string: navigator.userAgent || null,
    };

    const { data } = await (supabase as any).from("ebook_views").insert(insertPayload).select("id").single();
    if (data) {
      setViewId(data.id);
      if (email?.trim() || phone?.trim()) {
        invokeLeadCapture(eb, data.id, name, email, phone, consentGiven, marketingOptIn);
      }
    }
  }

  const invokeLeadCapture = useCallback(async (
    eb: EbookData, vId: string,
    name?: string, email?: string, phone?: string,
    consentGiven?: boolean, marketingOptIn?: boolean,
  ) => {
    try {
      const { data } = await supabase.functions.invoke("ebook-lead-capture", {
        body: {
          workspace_id: eb.workspace_id,
          ebook_id: eb.id,
          view_id: vId,
          name: name || "",
          email: email || "",
          phone: phone || "",
          consent_given: consentGiven || false,
          marketing_opt_in: marketingOptIn || false,
          utm_source: searchParams.get("utm_source") || null,
          utm_medium: searchParams.get("utm_medium") || null,
          utm_campaign: searchParams.get("utm_campaign") || null,
          slug: eb.slug || slug,
        },
      });
      if (data?.contact_id) setContactId(data.contact_id);
      if (data?.lead_id) setLeadId(data.lead_id);
    } catch (err) {
      console.warn("[EbookLeadCapture] Error:", err);
    }
  }, [searchParams, slug]);

  async function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ebook) return;
    const cfg = resolveGateConfig(ebook);
    const nameOk = !cfg.requireName || gateName.trim().length > 0;
    const emailOk = !cfg.requireEmail || gateEmail.trim().length > 0;
    const phoneOk = !cfg.requirePhone || gatePhone.trim().length > 0;
    if (!nameOk || !emailOk || !phoneOk) return;

    const needsConsent = ebook.consent_required || (ebook.consent_text && ebook.consent_text.trim().length > 0);
    if (needsConsent && !gateConsent) return;

    setGateSubmitting(true);
    localStorage.setItem(
      `ebook_gate_${ebook.id}`,
      JSON.stringify({ name: gateName, email: gateEmail, phone: gatePhone })
    );

    if (viewId) {
      // Já existia view anónima => actualiza dados + dispara captura
      await (supabase as any).from("ebook_views").update({
        reader_name: gateName || null,
        reader_email: gateEmail || null,
        reader_phone: gatePhone || null,
        consent_given: gateConsent,
        consent_text_version: gateConsent && ebook.consent_text ? simpleHash(ebook.consent_text) : null,
        marketing_opt_in: gateMarketingOptIn,
        consent_timestamp: gateConsent ? new Date().toISOString() : null,
      }).eq("id", viewId);
      await invokeLeadCapture(ebook, viewId, gateName, gateEmail, gatePhone, gateConsent, gateMarketingOptIn);
    } else {
      const sessionId = getSessionId();
      await createView(ebook, sessionId, gateName, gateEmail, gatePhone, gateConsent, gateMarketingOptIn);
    }

    setGateOpen(false);
    setGateSubmitting(false);
  }

  const metaTitle = ebook?.seo_title || ebook?.title || "eBook";
  const metaDescription = ebook?.seo_description || ebook?.subtitle || "";
  const ogImage = ebook?.og_image_url || ebook?.cover_url || "";
  const canonicalUrl = ebook?.canonical_url || (ebook?.slug ? `${window.location.origin}/ebook/${ebook.slug}` : "");

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-white/30" />
    </div>
  );

  if (error || !ebook) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-slate-950">
      <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4 border border-white/10">
        <BookOpen className="h-10 w-10 text-white/20" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">{error || "eBook não encontrado"}</h1>
    </div>
  );

  const cfg = resolveGateConfig(ebook);
  const needsConsent = ebook.consent_required || (ebook.consent_text && ebook.consent_text.trim().length > 0);

  // Lead gate overlay (renderizado por cima do reader quando trigger=after_pages)
  const gateForm = gateOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur p-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-white/5 border border-white/10 mx-auto mb-6">
          <BookOpen className="h-8 w-8 text-white/40" />
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-1">{cfg.title}</h2>
        <p className="text-sm text-white/50 text-center mb-6">{cfg.description}</p>
        <form onSubmit={handleGateSubmit} className="space-y-3">
          {cfg.requireName && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="O seu nome"
                value={gateName}
                onChange={e => setGateName(e.target.value)}
                required
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          )}
          {cfg.requireEmail && (
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                type="email"
                placeholder="O seu email"
                value={gateEmail}
                onChange={e => setGateEmail(e.target.value)}
                required
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          )}
          {cfg.requirePhone && (
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                type="tel"
                placeholder="O seu telemóvel"
                value={gatePhone}
                onChange={e => setGatePhone(e.target.value)}
                required
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          )}

          {needsConsent && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gateConsent}
                onChange={e => setGateConsent(e.target.checked)}
                className="rounded border-white/20 mt-0.5"
              />
              <span className="text-xs text-white/60 leading-tight">
                {ebook.consent_text || "Aceito a recolha e tratamento dos meus dados pessoais."}
                {ebook.privacy_policy_url && (
                  <>
                    {" "}
                    <a href={ebook.privacy_policy_url} target="_blank" rel="noopener noreferrer"
                      className="underline text-white/80 hover:text-white inline-flex items-center gap-0.5">
                      Política de Privacidade
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </>
                )}
              </span>
            </label>
          )}

          {ebook.marketing_opt_in_enabled && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gateMarketingOptIn}
                onChange={e => setGateMarketingOptIn(e.target.checked)}
                className="rounded border-white/20 mt-0.5"
              />
              <span className="text-xs text-white/60 leading-tight">
                {ebook.marketing_opt_in_label || "Quero receber comunicações e novidades"}
              </span>
            </label>
          )}

          <Button type="submit" className="w-full" disabled={gateSubmitting}>
            {gateSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {cfg.ctaLabel}
          </Button>
        </form>
      </div>
    </div>
  );

  // Gate "always" sem view ainda criada => mostrar só o form (sem reader)
  const blockReader = cfg.enabled && cfg.trigger === "always" && gateOpen && !viewId;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        {ebook.noindex && <meta name="robots" content="noindex, nofollow" />}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:type" content="book" />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      </Helmet>
      {!blockReader && (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="w-full max-w-[96vw]">
            <FlipbookReader
              title={ebook.title}
              subtitle={ebook.subtitle}
              author={ebook.author_name}
              coverUrl={ebook.cover_url}
              chapters={ebook.chapters}
              headerText={ebook.header_text}
              footerText={ebook.footer_text}
              contactPage={ebook.contact_page}
              styleTokens={ebook.global_styles}
              protectionEnabled={ebook.protection_enabled !== false}
              watermarkText="Documento Protegido"
              ebookId={ebook.id}
              workspaceId={ebook.workspace_id}
              trackingViewId={viewId || undefined}
              ctas={ctas}
              contactId={contactId || undefined}
              leadId={leadId || undefined}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
      {gateForm}
    </>
  );
}
