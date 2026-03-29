import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Mail, User } from "lucide-react";
import { FlipbookReader } from "@/components/ebooks/FlipbookReader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  workspace_id: string;
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

export default function PublicEbookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [ebook, setEbook] = useState<EbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateName, setGateName] = useState("");
  const [gateEmail, setGateEmail] = useState("");
  const [gateSubmitting, setGateSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!slug) { setError("Slug não encontrado"); setLoading(false); return; }
      const { data, error: err } = await (supabase as any)
        .from("ebooks")
        .select("id, title, subtitle, author_name, cover_url, chapters, header_text, footer_text, contact_page, global_styles, protection_enabled, lead_gate_enabled, workspace_id")
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

  // After ebook loads, check if gate needed or create anonymous view
  useEffect(() => {
    if (!ebook || viewId) return;
    const sessionId = getSessionId();
    const gateKey = `ebook_gate_${ebook.id}`;
    const previousGate = localStorage.getItem(gateKey);

    if (ebook.lead_gate_enabled && !previousGate) {
      setGateOpen(true);
      return;
    }

    // Create anonymous view (or returning gated user)
    const prev = previousGate ? JSON.parse(previousGate) : {};
    createView(ebook, sessionId, prev.name, prev.email);
  }, [ebook]);

  async function createView(eb: EbookData, sessionId: string, name?: string, email?: string) {
    const totalPages = eb.chapters.reduce((s, ch) => s + Math.max(1, Math.ceil((ch.content?.length || 0) / 800)), 0) + 2;

    // Match CRM: procurar contacto pelo email no workspace
    let contactId: string | null = null;
    if (email?.trim()) {
      const { data: contactMatch } = await supabase
        .from("contacts")
        .select("id")
        .eq("workspace_id", eb.workspace_id)
        .eq("email", email.trim())
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (contactMatch) contactId = contactMatch.id;
    }

    const { data } = await (supabase as any).from("ebook_views").insert({
      ebook_id: eb.id,
      workspace_id: eb.workspace_id,
      session_id: sessionId,
      reader_name: name || null,
      reader_email: email || null,
      contact_id: contactId,
      referrer: document.referrer || null,
      utm_source: searchParams.get("utm_source") || null,
      utm_medium: searchParams.get("utm_medium") || null,
      utm_campaign: searchParams.get("utm_campaign") || null,
      device_type: getDeviceType(),
      total_pages: totalPages,
    }).select("id").single();
    if (data) setViewId(data.id);
  }

  async function handleGateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gateEmail.trim() || !gateName.trim() || !ebook) return;
    setGateSubmitting(true);
    const sessionId = getSessionId();
    localStorage.setItem(`ebook_gate_${ebook.id}`, JSON.stringify({ name: gateName, email: gateEmail }));
    await createView(ebook, sessionId, gateName, gateEmail);
    setGateOpen(false);
    setGateSubmitting(false);
  }

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

  // Lead gate form
  if (gateOpen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur">
          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-white/5 border border-white/10 mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-white/40" />
          </div>
          <h2 className="text-xl font-bold text-white text-center mb-1">{ebook!.title}</h2>
          <p className="text-sm text-white/50 text-center mb-6">Insira os seus dados para aceder ao eBook</p>
          <form onSubmit={handleGateSubmit} className="space-y-3">
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
            <Button type="submit" className="w-full" disabled={gateSubmitting}>
              {gateSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aceder ao eBook
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
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
        />
      </div>
    </div>
  );
}
