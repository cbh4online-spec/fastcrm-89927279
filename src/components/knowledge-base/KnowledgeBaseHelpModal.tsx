import { useState } from "react";
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
} from "lucide-react";
import { useKBHelp, KBHelpArticle, KBHelpCategory } from "@/hooks/useKBHelp";
import ReactMarkdown from "react-markdown";

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

export function KnowledgeBaseHelpModal({ open, onOpenChange }: KnowledgeBaseHelpModalProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[1100px] max-h-[85vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-[80vh]">
          {/* Sidebar */}
          <div className="w-[260px] border-r flex flex-col bg-muted/30 shrink-0">
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
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
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
                    onClick={() => { setSelectedCategory(cat.slug); closeArticle(); setSearchQuery(""); }}
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
            {selectedArticle ? (
              /* Article detail view */
              <ArticleView
                article={selectedArticle}
                relatedArticles={relatedArticles}
                userFeedback={userFeedback}
                onBack={closeArticle}
                onOpenArticle={openArticle}
                onSubmitFeedback={(isHelpful) =>
                  submitFeedback.mutate({ articleId: selectedArticle.id, isHelpful })
                }
              />
            ) : (
              /* Article list */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b">
                  <h3 className="text-sm font-semibold">
                    {searchQuery
                      ? `Resultados para "${searchQuery}"`
                      : selectedCategory
                        ? categories.find((c) => c.slug === selectedCategory)?.title || "Artigos"
                        : "Todos os artigos"}
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

                    {!isLoadingArticles && articles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        category={categories.find((c) => c.slug === article.category_slug)}
                        onClick={() => openArticle(article)}
                      />
                    ))}

                    {showAiOption && (
                      <div className="text-center py-8 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Não encontrámos artigos para "{searchQuery}"
                        </p>
                        <Button
                          onClick={() => askAI(searchQuery)}
                          disabled={isAiLoading}
                          className="gap-2"
                        >
                          {isAiLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          Perguntar à IA
                        </Button>
                      </div>
                    )}

                    {aiAnswer && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-primary">
                          <Sparkles className="h-3.5 w-3.5" />
                          Resposta da IA
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                          <ReactMarkdown>{aiAnswer}</ReactMarkdown>
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
            {category && (
              <span className="text-xs" title={category.title}>
                {category.icon}
              </span>
            )}
            <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {article.title}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{article.summary}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${typeInfo.color}`}>
              {typeInfo.label}
            </Badge>
            {article.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5">
                {tag}
              </Badge>
            ))}
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
              <Eye className="h-2.5 w-2.5" />
              {article.view_count}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

function ArticleView({
  article,
  relatedArticles,
  userFeedback,
  onBack,
  onOpenArticle,
  onSubmitFeedback,
}: {
  article: KBHelpArticle;
  relatedArticles: KBHelpArticle[];
  userFeedback: { is_helpful: boolean } | null | undefined;
  onBack: () => void;
  onOpenArticle: (a: KBHelpArticle) => void;
  onSubmitFeedback: (isHelpful: boolean) => void;
}) {
  const typeInfo = TYPE_LABELS[article.article_type] || TYPE_LABELS.guide;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{article.title}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${typeInfo.color}`}>
              {typeInfo.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(article.updated_at).toLocaleDateString("pt-PT")}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-[700px]">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{article.content_md}</ReactMarkdown>
          </div>

          {/* Feedback */}
          <div className="mt-8 pt-6 border-t">
            <p className="text-sm font-medium mb-3">Este artigo foi útil?</p>
            <div className="flex gap-2">
              <Button
                variant={userFeedback?.is_helpful === true ? "default" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => onSubmitFeedback(true)}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                Sim
              </Button>
              <Button
                variant={userFeedback?.is_helpful === false ? "destructive" : "outline"}
                size="sm"
                className="gap-1.5"
                onClick={() => onSubmitFeedback(false)}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                Não
              </Button>
            </div>
          </div>

          {/* Related */}
          {relatedArticles.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm font-medium mb-3">Artigos relacionados</p>
              <div className="space-y-2">
                {relatedArticles.map((ra) => (
                  <button
                    key={ra.id}
                    onClick={() => onOpenArticle(ra)}
                    className="w-full text-left rounded-md border p-2.5 hover:bg-muted/50 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium truncate">{ra.title}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
