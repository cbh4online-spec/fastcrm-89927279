import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Edit3, Save, Loader2, Scroll, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUpdateVision, type VisionProfile } from "@/hooks/useVision";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Props {
  vision: VisionProfile;
}

export function ManifestoEditor({ vision }: Props) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(vision.manifesto || "");
  const updateVision = useUpdateVision();

  const handleSave = () => {
    updateVision.mutate({ id: vision.id, manifesto: content }, {
      onSuccess: () => setEditing(false),
    });
  };

  const updatedDate = vision.updated_at
    ? format(new Date(vision.updated_at), "d 'de' MMMM, yyyy", { locale: pt })
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <Scroll className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">O Meu Manifesto</h2>
            <p className="text-xs text-muted-foreground">Declaração pessoal de visão e compromisso</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-2">
          {editing ? <><Eye className="h-4 w-4" />Pré-visualizar</> : <><Edit3 className="h-4 w-4" />Editar</>}
        </Button>
      </div>

      {editing ? (
        /* ── Edit Mode ── */
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b border-border/50">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Suporta Markdown: **negrito**, *itálico*, ## títulos, - listas</span>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm bg-background"
              placeholder="Escreve o teu manifesto em Markdown..."
            />
            <div className="flex justify-end">
              <Button size="sm" className="gap-2" onClick={handleSave} disabled={updateVision.isPending}>
                {updateVision.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── View Mode ── */
        <div className="relative rounded-xl overflow-hidden border border-primary/15 shadow-lg" style={{ boxShadow: "0 4px 30px hsl(var(--primary) / 0.08)" }}>
          {/* Decorative top bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          {/* Content area */}
          <div className="bg-gradient-to-b from-card to-background p-8 md:p-10">
            {content ? (
              <div className="space-y-6">
                {/* Manifesto body with custom markdown rendering */}
                <div className="manifesto-content prose max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-6 pb-3 border-b border-primary/20">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight mt-8 mb-4 flex items-center gap-2">
                          <span className="inline-block h-5 w-1 rounded-full bg-primary" />
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-base leading-relaxed text-foreground/85 mb-4">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="text-primary/90 not-italic font-medium">{children}</em>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="my-6 pl-5 border-l-[3px] border-primary/40 bg-primary/5 rounded-r-lg py-4 pr-4 text-foreground/80 italic">
                          {children}
                        </blockquote>
                      ),
                      ul: ({ children }) => (
                        <ul className="space-y-3 my-5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="space-y-3 my-5 counter-reset-manifesto">{children}</ol>
                      ),
                      li: ({ children, ...props }) => {
                        // Detect if inside ol by checking for ordered prop
                        const isOrdered = (props as any).ordered;
                        const index = (props as any).index ?? 0;
                        return (
                          <li className="flex items-start gap-3 text-base leading-relaxed text-foreground/85">
                            {isOrdered ? (
                              <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold mt-0.5">
                                {index + 1}
                              </span>
                            ) : (
                              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary/50 mt-2.5" />
                            )}
                            <span className="flex-1">{children}</span>
                          </li>
                        );
                      },
                      hr: () => (
                        <div className="my-8 flex items-center gap-3">
                          <div className="flex-1 h-px bg-border" />
                          <Sparkles className="h-3.5 w-3.5 text-primary/40" />
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <Scroll className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-muted-foreground">
                  Ainda não escreveste o teu manifesto.
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Clica em "Editar" para começar a definir a tua visão.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {content && (
            <div className="px-8 py-4 bg-muted/30 border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
                  <Scroll className="h-3 w-3" />
                  Manifesto Pessoal
                </span>
              </div>
              {updatedDate && (
                <span className="text-xs text-muted-foreground">
                  Atualizado a {updatedDate}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
