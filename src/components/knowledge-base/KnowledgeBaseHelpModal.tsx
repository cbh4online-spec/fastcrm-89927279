import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  BookOpen,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Loader2,
  FileText,
  ChevronRight,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { useKBHelp, KBHelpArticle, KBHelpCategory } from "@/hooks/useKBHelp";
import ReactMarkdown from "react-markdown";
import { useLocation } from "react-router-dom";

interface KnowledgeBaseHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  guide: { label: "Guia", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  "how-to": { label: "Como fazer", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
  reference: { label: "Referência", color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700" },
  faq: { label: "FAQ", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  video: { label: "Vídeo", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800" },
};

const POPULAR_SLUGS = [
  "bem-vindo-ao-fastcrm",
  "configurar-workspace",
  "introducao-crm",
  "primeira-campanha-email",
  "introducao-security-ops",
  "introducao-automacoes",
];

function getKBCategoryFromRoute(pathname: string): string | null {
  if (pathname.includes('/email-campaigns')) return 'email-marketing';
  if (pathname.includes('/contacts') || pathname.includes('/leads')) return 'crm';
  if (pathname.includes('/security')) return 'security-ops';
  if (pathname.includes('/funnels') || pathname.includes('/landing')) return 'marketing';
  if (pathname.includes('/proposals') || pathname.includes('/products')) return 'vendas';
  if (pathname.includes('/automations')) return 'automacoes';
  if (pathname.includes('/b2b') || pathname.includes('/client-portal')) return 'portal-b2b';
  if (pathname.includes('/store')) return 'loja';
  if (pathname.includes('/settings') || pathname.includes('/integrations')) return 'admin';
  return null;
}

// Debounce hook
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function KnowledgeBaseHelpModal({ open, onOpenChange }: KnowledgeBaseHelpModalProps) {
  const location = useLocation();
  const [localSearch, setLocalSearch] = useState("");
  const debouncedSearch = useDebounce(localSearch, 300);

  const {
    categories,
    articles,
    selectedCategory,
    selectedArticle,
    searchQuery,
    relatedArticles,
    userFeedback,
    aiAnswer,
    isAiLoading,
    isLoadingArticles,
    hasResults,
    showAiOption,
    setSearchQuery,
    setSelectedCategory,
    openArticle,
    closeArticle,
    submitFeedback,
    askAI,
  } = useKBHelp();

  // Sync debounced search to hook
  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Context-sensitive category on open
  useEffect(() => {
    if (open) {
      const cat = getKBCategoryFromRoute(location.pathname);
      if (cat) setSelectedCategory(cat);
    }
  }, [open, location.pathname, setSelectedCategory]);

  // Keyboard shortcut: Ctrl+H
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const categoryTitle = categories.find((c) => c.slug === selectedCategory)?.title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[1100px] max-h-[85vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-[80vh]">
          {/* Sidebar — hidden on mobile */}
          <div className="w-[260px] border-r flex-col bg-muted/30 shrink-0 hidden md:flex">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-primary" />
                Base de Conhecimento
              </h2>
            </div>

            {/* Search */}
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar artigos..."
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    setSelectedCategory(null);
                  }}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {/* Categories */}
            <ScrollArea className="flex-1">
              <div className="px-2 pb-3 space-y-0.5">
                <button
                  onClick={() => { setSelectedCategory(null); closeArticle(); }}
                  className={`w-full text-left rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    !selectedCategory ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  📋 Todos os artigos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => { setSelectedCategory(cat.slug); closeArticle(); setLocalSearch(""); }}
                    className={`w-full text-left rounded-md px-3 py-2 text-xs transition-colors ${
                      selectedCategory === cat.slug
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="mr-1.5">{cat.icon}</span>
                    {cat.title}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile search bar */}
            <div className="md:hidden p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar artigos..."
                  value={localSearch}
                  onChange={(e) => { setLocalSearch(e.target.value); setSelectedCategory(null); }}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            {selectedArticle ? (
              <ArticleView
                article={selectedArticle}
                relatedArticles={relatedArticles}
                userFeedback={userFeedback}
                categoryTitle={categoryTitle}
                onBack={closeArticle}
                onOpenArticle={openArticle}
                onSubmitFeedback={(isHelpful) =>
                  submitFeedback.mutate({ articleId: selectedArticle.id, isHelpful })
                }
                categories={categories}
              />
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b">
                  <h3 className="text-sm font-semibold">
                    {searchQuery
                      ? `Resultados para "${searchQuery}"`
                      : categoryTitle || "Todos os artigos"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {articles.length} artigo{articles.length !== 1 ? "s" : ""} encontrado{articles.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    {isLoadingArticles && (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {/* Welcome tiles */}
                    {!isLoadingArticles && !searchQuery && !selectedCategory && articles.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          Tópicos populares
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {POPULAR_SLUGS
                            .map((slug) => articles.find((a) => a.slug === slug))
                            .filter(Boolean)
                            .slice(0, 6)
                            .map((article) => {
                              const cat = categories.find((c) => c.slug === article!.category_slug);
                              const typeInfo = TYPE_LABELS[article!.article_type] || TYPE_LABELS.guide;
                              return (
                                <button
                                  key={article!.id}
                                  onClick={() => openArticle(article!)}
                                  className="text-left rounded-lg border bg-card p-3 hover:bg-secondary cursor-pointer transition-all group"
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {cat && <span className="text-sm">{cat.icon}</span>}
                                    <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${typeInfo.color}`}>
                                      {typeInfo.label}
                                    </Badge>
                                  </div>
                                  <h5 className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                                    {article!.title}
                                  </h5>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Filtered article list */}
                    {!isLoadingArticles && (searchQuery || selectedCategory) && articles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        category={categories.find((c) => c.slug === article.category_slug)}
                        onClick={() => openArticle(article)}
                      />
                    ))}

                    {/* All articles below popular */}
                    {!isLoadingArticles && !searchQuery && !selectedCategory && articles.length > 0 && (
                      <>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-2">
                          Todos os artigos
                        </h4>
                        {articles.map((article) => (
                          <ArticleCard
                            key={article.id}
                            article={article}
                            category={categories.find((c) => c.slug === article.category_slug)}
                            onClick={() => openArticle(article)}
                          />
                        ))}
                      </>
                    )}

                    {/* AI fallback */}
                    {showAiOption && !aiAnswer && !isAiLoading && (
                      <div className="text-center py-8 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Não encontrámos artigos para "{searchQuery}"
                        </p>
                        <Button onClick={() => askAI(searchQuery)} className="gap-2">
                          <Sparkles className="h-4 w-4" />
                          Perguntar à IA
                        </Button>
                      </div>
                    )}

                    {isAiLoading && (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                          <div className="relative h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground animate-pulse">A consultar o assistente...</p>
                      </div>
                    )}

                    {aiAnswer && !isAiLoading && (
                      <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-5 space-y-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-primary tracking-wide uppercase">Resposta do Assistente IA</span>
                        </div>
                        <div className="kb-prose text-sm leading-relaxed">
                          <ReactMarkdown>{aiAnswer}</ReactMarkdown>
                        </div>
                        <div className="pt-2 border-t border-primary/10">
                          <p className="text-[10px] text-muted-foreground">
                            Resposta gerada por IA — pode conter imprecisões. Contacta o suporte para dúvidas específicas.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Article Card ── */

function ArticleCard({
  article,
  category,
  onClick,
}: {
  article: KBHelpArticle;
  category?: KBHelpCategory;
  onClick: () => void;
}) {
  const typeInfo = TYPE_LABELS[article.article_type] || TYPE_LABELS.guide;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border p-3 hover:bg-secondary hover:border-primary/40 cursor-pointer transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {category && <span className="text-xs" title={category.title}>{category.icon}</span>}
            <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{article.title}</h4>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${typeInfo.color}`}>{typeInfo.label}</Badge>
            {article.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5">{tag}</Badge>
            ))}
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
              <Eye className="h-2.5 w-2.5" />{article.view_count}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

/* ── Article View ── */

function ArticleView({
  article,
  relatedArticles,
  userFeedback,
  categoryTitle,
  onBack,
  onOpenArticle,
  onSubmitFeedback,
  categories,
}: {
  article: KBHelpArticle;
  relatedArticles: KBHelpArticle[];
  userFeedback: { is_helpful: boolean } | null | undefined;
  categoryTitle?: string;
  onBack: () => void;
  onOpenArticle: (a: KBHelpArticle) => void;
  onSubmitFeedback: (isHelpful: boolean) => void;
  categories: KBHelpCategory[];
}) {
  const typeInfo = TYPE_LABELS[article.article_type] || TYPE_LABELS.guide;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        {/* Mobile: ← Voltar */}
        <Button variant="ghost" size="sm" className="md:hidden gap-1.5 h-7 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-xs">Voltar</span>
        </Button>
        {/* Desktop: breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5 min-w-0">
          <button onClick={onBack} className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0">
            {categoryTitle || "Artigos"}
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate">{article.title}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${typeInfo.color}`}>{typeInfo.label}</Badge>
          <span className="text-[10px] text-muted-foreground">
            {new Date(article.updated_at).toLocaleDateString("pt-PT")}
          </span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-[700px]">
          <h1 className="text-lg font-bold mb-4 md:hidden">{article.title}</h1>
          <div className="kb-prose">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mt-5 mb-2 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-4 mb-1.5 text-foreground">{children}</h3>,
                p: ({ children }) => <p className="text-sm leading-relaxed mb-3 text-foreground/90">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-foreground/90">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-foreground/90">{children}</ol>,
                li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-amber-400 dark:border-amber-600 pl-4 py-1 my-3 italic text-muted-foreground text-sm">
                    {children}
                  </blockquote>
                ),
                code: ({ className, children }) => {
                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return (
                      <pre className="bg-secondary border border-border rounded-md p-3 my-3 overflow-x-auto border-l-2 border-l-primary/40">
                        <code className="text-xs font-mono text-foreground">{children}</code>
                      </pre>
                    );
                  }
                  return <code className="bg-secondary text-foreground font-mono text-xs px-1.5 py-0.5 rounded">{children}</code>;
                },
                pre: ({ children }) => <>{children}</>,
                hr: () => <hr className="my-4 border-border" />,
              }}
            >
              {article.content_md}
            </ReactMarkdown>
          </div>

          {/* Feedback */}
          <div className="mt-8 pt-6 border-t">
            {userFeedback != null ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Obrigado pelo teu feedback! ✓
              </div>
            ) : (
              <>
                <p className="text-sm font-medium mb-3">Este artigo foi útil?</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onSubmitFeedback(true)}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Sim, ajudou
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onSubmitFeedback(false)}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Precisa de melhorias
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Related articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-medium mb-3">Artigos relacionados</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {relatedArticles.map((ra) => {
                  const raCat = categories.find((c) => c.slug === ra.category_slug);
                  const raType = TYPE_LABELS[ra.article_type] || TYPE_LABELS.guide;
                  return (
                    <button
                      key={ra.id}
                      onClick={() => onOpenArticle(ra)}
                      className="text-left rounded-lg border p-3 hover:bg-secondary transition-colors group"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {raCat && <span className="text-xs">{raCat.icon}</span>}
                        <Badge variant="outline" className={`text-[9px] h-3.5 px-1 ${raType.color}`}>
                          {raType.label}
                        </Badge>
                      </div>
                      <span className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {ra.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
