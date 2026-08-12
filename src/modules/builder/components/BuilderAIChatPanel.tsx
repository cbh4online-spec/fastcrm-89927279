import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizonal, Sparkles, Trash2, Undo2, Crosshair, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBuilderAIChat } from "../hooks/useBuilderAIChat";
import type { VisualSelection } from "./BuilderVisualEditor";
import type { BuilderPatch } from "../lib/builderHtmlPatch";

interface Props {
  assetId: string;
  workspaceId: string;
  assetType: string;
  fullHtml: string;
  selection: VisualSelection | null;
  selectionOuterHtml: string | null;
  onReplaceFullHtml: (html: string) => void;
  onPatch: (patch: BuilderPatch) => void;
}

const SUGGESTIONS = [
  "Cria uma landing completa para o meu serviço",
  "Adiciona uma secção de FAQ",
  "Adiciona um formulário de contacto",
  "Torna o texto mais persuasivo",
  "Muda a paleta para tons escuros",
  "Adiciona prova social com testemunhos",
];

export function BuilderAIChatPanel({
  assetId,
  workspaceId,
  assetType,
  fullHtml,
  selection,
  selectionOuterHtml,
  onReplaceFullHtml,
  onPatch,
}: Props) {
  const { messages, isLoading, isSending, send, clear } = useBuilderAIChat(assetId, workspaceId);
  const [input, setInput] = useState("");
  const [lastUndo, setLastUndo] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasSelection = !!selection?.bid && !!selectionOuterHtml;

  useEffect(() => {
    const el = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isSending]);

  async function handleSend(text?: string) {
    const prompt = (text ?? input).trim();
    if (!prompt) {
      toast.error("Escreve o que queres que a IA faça");
      return;
    }
    if (isSending) return;

    const htmlBefore = fullHtml;
    setInput("");
    try {
      const result = await send({
        prompt,
        fullHtml,
        selectionHtml: hasSelection ? selectionOuterHtml : null,
        selectionBid: selection?.bid ?? null,
        assetType,
      });

      if (result.scope === "selection" && selection?.bid) {
        onPatch({ type: "replaceOuter", bid: selection.bid, value: result.html });
      } else {
        onReplaceFullHtml(result.html);
      }
      setLastUndo(htmlBefore);
      toast.success(result.summary);
    } catch (e) {
      toast.error("Falha na IA", { description: e instanceof Error ? e.message : undefined });
    }
  }

  function handleUndo() {
    if (!lastUndo) return;
    onReplaceFullHtml(lastUndo);
    setLastUndo(null);
    toast.success("Alteração revertida");
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2 shrink-0">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium flex-1">Assistente IA</h3>
        {lastUndo && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleUndo}>
            <Undo2 className="h-3.5 w-3.5 mr-1" /> Reverter
          </Button>
        )}
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Limpar conversa"
            onClick={() => clear.mutate()}
            disabled={clear.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="px-3 py-1.5 border-b text-[11px] flex items-center gap-1.5 bg-background shrink-0">
        <Crosshair className="h-3 w-3 text-muted-foreground" />
        {hasSelection ? (
          <span>
            A editar o bloco <code className="font-mono">{selection?.tag}</code>
          </span>
        ) : (
          <span className="text-muted-foreground">Sem bloco seleccionado — a IA altera a página inteira</span>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-3 space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Fala com a IA em linguagem natural. Ela cria e altera a página por ti — podes reverter a qualquer momento
                com ⌘Z.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[92%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : m.is_error
                        ? "border border-destructive/40 bg-destructive/10 text-foreground"
                        : "border bg-muted/40 text-foreground",
                  )}
                >
                  {m.is_error && (
                    <span className="flex items-center gap-1 font-medium mb-1">
                      <AlertTriangle className="h-3 w-3" /> Erro
                    </span>
                  )}
                  {m.content}
                  {m.role === "assistant" && !m.is_error && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {m.target_bid ? "bloco" : "página"}
                      </Badge>
                      {m.html_before && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => {
                            onReplaceFullHtml(m.html_before!);
                            toast.success("HTML anterior restaurado");
                          }}
                        >
                          <Undo2 className="h-3 w-3 mr-1" /> Restaurar antes
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> A gerar…
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-2 shrink-0 space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={3}
          placeholder={hasSelection ? "Ex: torna este bloco mais compacto e muda o CTA" : "Ex: cria uma landing para consultoria financeira com hero, benefícios e FAQ"}
          className="text-sm resize-none"
          disabled={isSending}
        />
        <Button size="sm" className="w-full" onClick={() => handleSend()} disabled={isSending || !input.trim()}>
          {isSending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <SendHorizonal className="h-3.5 w-3.5 mr-1.5" />}
          Enviar (⌘↵)
        </Button>
      </div>
    </div>
  );
}
