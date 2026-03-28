import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

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
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Scroll progress
  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Mark chapter as read when navigating away
  const goToChapter = (index: number) => {
    setReadChapters(prev => new Set(prev).add(activeChapter));
    setActiveChapter(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
    </div>
  );

  if (error || !ebook) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-background">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mb-4 border border-primary/10">
        <BookOpen className="h-10 w-10 text-primary/30" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-2">{error || "eBook não encontrado"}</h1>
    </div>
  );

  const chapter = ebook.chapters[activeChapter];
  const nextChapter = activeChapter < ebook.chapters.length - 1 ? ebook.chapters[activeChapter + 1] : null;

  return (
    <div ref={contentRef} className="min-h-screen bg-background">
      {/* Sticky Header with reading progress */}
      <header className="sticky top-0 z-20">
        <div className="border-b border-border/40 bg-card/95 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-foreground truncate">{ebook.title}</h1>
              {ebook.subtitle && <p className="text-xs text-muted-foreground truncate">{ebook.subtitle}</p>}
            </div>
            <div className="flex items-center gap-3 ml-4">
              {ebook.author_name && (
                <span className="text-xs text-muted-foreground hidden sm:block">por {ebook.author_name}</span>
              )}
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {activeChapter + 1} / {ebook.chapters.length}
              </span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-border/30">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-12 gap-8">
        {/* Sidebar */}
        <nav className="col-span-3 sticky top-20 self-start space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">Índice</p>
          {ebook.chapters.map((ch, i) => {
            const isActive = i === activeChapter;
            const isRead = readChapters.has(i);
            return (
              <button
                key={ch.id}
                onClick={() => goToChapter(i)}
                className={`w-full text-left text-sm px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted/60 border-l-2 border-transparent"
                }`}
              >
                {isRead && !isActive ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <span className={`text-xs w-5 text-center shrink-0 ${isActive ? "text-primary font-bold" : ""}`}>{i + 1}</span>
                )}
                <span className="truncate">{ch.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <main className="col-span-9">
          <AnimatePresence mode="wait">
            <motion.article
              key={activeChapter}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {chapter ? (
                <>
                  <h2 className="text-3xl font-bold mb-8 text-foreground border-l-4 border-primary pl-4">{chapter.title}</h2>
                  <div className="prose dark:prose-invert max-w-none prose-lg prose-p:leading-[1.8] prose-p:text-foreground/80 prose-headings:text-foreground prose-headings:border-l-2 prose-headings:border-primary/30 prose-headings:pl-3 prose-blockquote:border-primary/30 prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:border prose-pre:border-border/50">
                    <ReactMarkdown>{chapter.content || "*Conteúdo em preparação*"}</ReactMarkdown>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Nenhum capítulo disponível.</p>
              )}

              {/* Next chapter card */}
              {nextChapter && (
                <div
                  className="mt-16 p-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                  onClick={() => goToChapter(activeChapter + 1)}
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Próximo capítulo</p>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {activeChapter + 2}. {nextChapter.title}
                  </h3>
                  <ChevronRight className="h-5 w-5 text-primary/50 group-hover:text-primary mt-2 transition-colors" />
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-border/40">
                <Button
                  variant="outline"
                  disabled={activeChapter === 0}
                  onClick={() => goToChapter(activeChapter - 1)}
                  className="border-border/60 hover:border-primary/30"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button
                  disabled={activeChapter >= ebook.chapters.length - 1}
                  onClick={() => goToChapter(activeChapter + 1)}
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  Seguinte <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>

              {/* Footer */}
              {ebook.author_name && (
                <div className="mt-8 text-center text-xs text-muted-foreground">
                  Escrito por <span className="font-medium text-foreground">{ebook.author_name}</span>
                </div>
              )}
            </motion.article>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
