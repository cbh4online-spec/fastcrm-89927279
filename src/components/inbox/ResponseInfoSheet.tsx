import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info, ChevronDown, ChevronRight, Brain, BookOpen, Target, Cpu, Loader2 } from "lucide-react";
import { useAIMessageAudit } from "@/hooks/useAIMessageAudit";

interface ResponseInfoSheetProps {
  messageId: string;
  children: React.ReactNode;
}

export function ResponseInfoSheet({ messageId, children }: ResponseInfoSheetProps) {
  const { data: audit, isLoading } = useAIMessageAudit(messageId);
  const [promptOpen, setPromptOpen] = useState(false);

  if (!audit && !isLoading) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-80 p-0">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : audit ? (
          <ScrollArea className="max-h-[400px]">
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Response Info</span>
              </div>

              {/* Intent */}
              {audit.intent?.label && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Intenção</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{audit.intent.label}</Badge>
                    {audit.intent.confidence && (
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(audit.intent.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* RAG Chunks */}
              {audit.rag_chunks && audit.rag_chunks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Base de Conhecimento ({audit.rag_chunks.length} fontes)
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {audit.rag_chunks.map((chunk, i) => (
                      <div key={i} className="p-2 rounded-md bg-muted/50 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{chunk.source}</span>
                          <Badge variant="outline" className="text-[10px] h-4">
                            {Math.round(chunk.score * 100)}%
                          </Badge>
                        </div>
                        {chunk.excerpt && (
                          <p className="text-muted-foreground line-clamp-2">{chunk.excerpt}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Meta */}
              {audit.model_meta?.model && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Modelo</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{audit.model_meta.model}</Badge>
                    {audit.model_meta.tokens && (
                      <span className="text-[10px] text-muted-foreground">{audit.model_meta.tokens} tokens</span>
                    )}
                    {audit.model_meta.latency_ms && (
                      <span className="text-[10px] text-muted-foreground">{audit.model_meta.latency_ms}ms</span>
                    )}
                  </div>
                </div>
              )}

              {/* Prompt Used (collapsible) */}
              {audit.prompt_used && (
                <Collapsible open={promptOpen} onOpenChange={setPromptOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs px-2">
                      <span>Prompt utilizado</span>
                      {promptOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 p-2 rounded-md bg-muted/50 text-[11px] text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {audit.prompt_used}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-4 text-xs text-muted-foreground text-center">
            Sem informação de auditoria
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
