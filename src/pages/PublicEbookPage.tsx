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
  cover_image?: string;
}

interface EbookData {
  id: string;
  title: string;
  subtitle?: string;
  author_name?: string;
  cover_url?: string;
  chapters: EbookChapter[];
}

export default function PublicEbookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [ebook, setEbook] = useState<EbookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState(-1); // -1 = cover page
  const [readChapters, setReadChapters] = useState<Set<number>>(new Set());
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      if (!slug) { setError("Slug não encontrado"); setLoading(false); return; }
      const { data, error: err } = await (supabase as any)
        .from("ebooks")
        .select("id, title, subtitle, author_name, cover_url, chapters")
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

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const goToChapter = (index: number) => {
    if (activeChapter >= 0) setReadChapters(prev => new Set(prev).add(activeChapter));
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

  const chapter = activeChapter >= 0 ? ebook.chapters[activeChapter] : null;
  const nextChapter = activeChapter < ebook.chapters.length - 1 ? ebook.chapters[activeChapter + 1] : null;
  const isCoverPage = activeChapter === -1;

  return (
    <div ref={contentRef} className="min-h-screen bg-[#faf9f7] dark:bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20">
        <div className="border-b border-border/30 bg-white/95 dark:bg-card/95 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold text-foreground truncate font-serif">{ebook.title}</h1>
              {ebook.subtitle && <p className="text-xs text-muted-foreground truncate">{ebook.subtitle}</p>}
            </div>
            <div className="flex items-center gap-3 ml-4">
              {ebook.author_name && <span className="text-xs text-muted-foreground hidden sm:block">por {ebook.author_name}</span>}
              {!isCoverPage && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {activeChapter + 1} / {ebook.chapters.length}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-border/20">
          <div className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-150" style={{ width: `${scrollProgress}%` }} />
        </div>
      </header>

      <AnimatePresence mode="wait">
        {isCoverPage ? (
          /* ─── COVER PAGE ─── */
          <motion.div key="cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
            {ebook.cover_url ? (
              <div className="mb-10 w-full max-w-lg">
                <img
                  src={ebook.cover_url}
                  alt={ebook.title}
                  className="w-full rounded-2xl shadow-2xl shadow-primary/10 border border-border/20"
                />
              </div>
            ) : (
              <div className="mb-10 w-64 h-80 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center shadow-2xl border border-primary/10">
                <BookOpen className="h-20 w-20 text-primary/25" />
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-serif mb-4 max-w-2xl leading-tight">{ebook.title}</h1>
            {ebook.subtitle && <p className="text-lg text-muted-foreground mb-4 max-w-lg font-serif italic">{ebook.subtitle}</p>}
            {ebook.author_name && (
              <p className="text-sm text-muted-foreground mb-8">por <span className="font-medium text-foreground">{ebook.author_name}</span></p>
            )}

            {/* Table of contents */}
            <div className="w-full max-w-md text-left mt-4 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Índice</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              {ebook.chapters.map((ch, i) => (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(i)}
                  className="w-full flex items-center gap-3 py-2.5 text-left hover:text-primary transition-colors group"
                >
                  <span className="text-xs font-bold text-primary/50 w-6 text-right tabular-nums">{i + 1}</span>
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors font-serif">{ch.title}</span>
                  <span className="flex-1 border-b border-dotted border-border/40 mx-2" />
                </button>
              ))}
            </div>

            <Button onClick={() => goToChapter(0)} size="lg" className="bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 font-serif">
              Começar a ler <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        ) : (
          /* ─── CHAPTER VIEW ─── */
          <motion.div key={`ch-${activeChapter}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            {/* Chapter hero image */}
            {chapter?.cover_image && (
              <div className="relative w-full h-64 md:h-80 overflow-hidden">
                <img src={chapter.cover_image} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f7] dark:from-background via-transparent to-transparent" />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/80 drop-shadow-lg">Capítulo {activeChapter + 1}</span>
                </div>
              </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-12 gap-8">
              {/* Sidebar */}
              <nav className="col-span-3 sticky top-20 self-start space-y-1">
                <button onClick={() => goToChapter(-1)} className="w-full text-left text-xs px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/60 transition-all mb-2 font-medium">
                  ← Capa
                </button>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-3">Índice</p>
                {ebook.chapters.map((ch, i) => {
                  const isActive = i === activeChapter;
                  const isRead = readChapters.has(i);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => goToChapter(i)}
                      className={`w-full text-left text-sm px-3 py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                        isActive ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" : "text-muted-foreground hover:bg-muted/60 border-l-2 border-transparent"
                      }`}
                    >
                      {isRead && !isActive ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <span className={`text-xs w-5 text-center shrink-0 ${isActive ? "text-primary font-bold" : ""}`}>{i + 1}</span>}
                      <span className="truncate">{ch.title}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Content — book-styled */}
              <main className="col-span-9">
                <article className="bg-white dark:bg-card rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.05)] px-12 md:px-16 py-14 min-h-[70vh]">
                  {chapter ? (
                    <>
                      {/* Chapter header */}
                      {!chapter.cover_image && (
                        <div className="mb-10">
                          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/50">Capítulo {activeChapter + 1}</span>
                          <div className="w-16 h-0.5 bg-primary/30 mt-2 mb-4" />
                        </div>
                      )}
                      <h2 className="text-3xl font-bold mb-10 text-foreground font-serif">{chapter.title}</h2>

                      {/* Prose with drop cap */}
                      <div className="prose prose-lg dark:prose-invert max-w-none font-serif
                        prose-p:leading-[1.9] prose-p:text-foreground/80 prose-p:mb-5
                        prose-headings:text-foreground prose-headings:font-bold prose-headings:font-serif prose-headings:border-l-2 prose-headings:border-primary/30 prose-headings:pl-4
                        prose-blockquote:border-primary/30 prose-blockquote:bg-primary/5 prose-blockquote:py-3 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-base
                        prose-img:rounded-xl prose-img:shadow-lg prose-img:mx-auto prose-img:my-8
                        prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                        prose-pre:bg-muted prose-pre:border prose-pre:border-border/50
                        [&>p:first-of-type]:first-letter:text-5xl [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:text-primary [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-3 [&>p:first-of-type]:first-letter:mt-1 [&>p:first-of-type]:first-letter:leading-none [&>p:first-of-type]:first-letter:font-serif
                      ">
                        <ReactMarkdown
                          components={{
                            img: ({ node, ...props }) => (
                              <figure className="my-10">
                                <img {...props} className="rounded-xl shadow-lg mx-auto max-w-full" />
                                {props.alt && <figcaption className="text-center text-sm text-muted-foreground mt-3 italic font-serif">{props.alt}</figcaption>}
                              </figure>
                            ),
                          }}
                        >
                          {chapter.content || "*Conteúdo em preparação*"}
                        </ReactMarkdown>
                      </div>

                      {/* Ornamental divider */}
                      <div className="flex items-center justify-center mt-16 gap-3">
                        <div className="w-12 h-px bg-border" />
                        <span className="text-lg text-muted-foreground/30">✦</span>
                        <div className="w-12 h-px bg-border" />
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Nenhum capítulo disponível.</p>
                  )}

                  {/* Next chapter card */}
                  {nextChapter && (
                    <div
                      className="mt-12 p-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                      onClick={() => goToChapter(activeChapter + 1)}
                    >
                      {nextChapter.cover_image && (
                        <div className="mb-3 -mx-6 -mt-6 overflow-hidden rounded-t-xl">
                          <img src={nextChapter.cover_image} alt="" className="w-full h-32 object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                        </div>
                      )}
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Próximo capítulo</p>
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors font-serif">
                        {activeChapter + 2}. {nextChapter.title}
                      </h3>
                      <ChevronRight className="h-5 w-5 text-primary/50 group-hover:text-primary mt-2 transition-colors" />
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-8 pt-6 border-t border-border/30">
                    <Button variant="outline" onClick={() => goToChapter(activeChapter - 1)} className="border-border/60 hover:border-primary/30 font-serif">
                      <ChevronLeft className="h-4 w-4 mr-1" /> {activeChapter === 0 ? "Capa" : "Anterior"}
                    </Button>
                    <Button disabled={activeChapter >= ebook.chapters.length - 1} onClick={() => goToChapter(activeChapter + 1)} className="bg-gradient-to-r from-primary to-primary/80 font-serif">
                      Seguinte <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </article>

                {/* Footer */}
                {ebook.author_name && (
                  <div className="mt-8 text-center text-xs text-muted-foreground font-serif">
                    Escrito por <span className="font-medium text-foreground">{ebook.author_name}</span>
                  </div>
                )}
              </main>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
