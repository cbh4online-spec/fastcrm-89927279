import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface EbookChapter {
  id: string;
  title: string;
  content: string;
}

interface EbookData {
  id: string;
  title: string;
  subtitle?: string;
  author_name?: string;
  chapters: EbookChapter[];
}

export default function PublicEbookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [ebook, setEbook] = useState<EbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    async function load() {
      if (!slug) { setError("Slug não encontrado"); setLoading(false); return; }
      const { data, error: err } = await (supabase as any)
        .from("ebooks")
        .select("id, title, subtitle, author_name, chapters")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (err) { setError("Erro ao carregar eBook"); setLoading(false); return; }
      if (!data) { setError("eBook não encontrado"); setLoading(false); return; }
      setEbook({ ...data, chapters: Array.isArray(data.chapters) ? data.chapters : [] });
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error || !ebook) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h1 className="text-xl font-bold mb-2">{error || "eBook não encontrado"}</h1>
    </div>
  );

  const chapter = ebook.chapters[activeChapter];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{ebook.title}</h1>
            {ebook.subtitle && <p className="text-xs text-muted-foreground">{ebook.subtitle}</p>}
          </div>
          <div className="text-sm text-muted-foreground">
            {activeChapter + 1} / {ebook.chapters.length}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <nav className="col-span-3 sticky top-20 self-start space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Índice</p>
          {ebook.chapters.map((ch, i) => (
            <button
              key={ch.id}
              onClick={() => setActiveChapter(i)}
              className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                i === activeChapter ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {i + 1}. {ch.title}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="col-span-9">
          {chapter ? (
            <article>
              <h2 className="text-2xl font-bold mb-6">{chapter.title}</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{chapter.content || "*Conteúdo em preparação*"}</ReactMarkdown>
              </div>
            </article>
          ) : (
            <p className="text-muted-foreground">Nenhum capítulo disponível.</p>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-12 pt-6 border-t">
            <Button
              variant="outline"
              disabled={activeChapter === 0}
              onClick={() => setActiveChapter((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              disabled={activeChapter >= ebook.chapters.length - 1}
              onClick={() => setActiveChapter((p) => p + 1)}
            >
              Seguinte <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
