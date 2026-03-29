import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen } from "lucide-react";
import { FlipbookReader } from "@/components/ebooks/FlipbookReader";

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
}

export default function PublicEbookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [ebook, setEbook] = useState<EbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!slug) { setError("Slug não encontrado"); setLoading(false); return; }
      const { data, error: err } = await (supabase as any)
        .from("ebooks")
        .select("id, title, subtitle, author_name, cover_url, chapters, header_text, footer_text, contact_page, global_styles, protection_enabled")
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
        />
      </div>
    </div>
  );
}
