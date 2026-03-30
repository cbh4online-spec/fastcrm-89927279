import { useState } from "react";
import { Brain, Pencil, ArrowRight, RefreshCw, Zap, Bot, ArrowRightLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useContextScore, BlockStatus } from "@/hooks/useContextScore";
import { BusinessContext, BusinessContextUpdate, useBusinessContext } from "@/hooks/useBusinessContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { motion } from "framer-motion";
import { ContextBlockEditor } from "./ContextBlockEditor";
import { ContextOSExport } from "./ContextOSExport";
import { NextBestActionsPanel } from "./NextBestActionsPanel";
import { useAgentWorkItems, useAgentHandoffs } from "@/hooks/useAgentOperations";
import { useBots } from "@/hooks/useBots";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface ContextOSHubProps {
  data: BusinessContext | null;
}

function stateColor(state: BlockStatus['state']) {
  switch (state) {
    case 'filled': return 'text-emerald-500';
    case 'aging': return 'text-amber-500';
    case 'stale': return 'text-destructive';
    case 'empty': return 'text-muted-foreground/40';
  }
}

function stateIcon(state: BlockStatus['state']) {
  switch (state) {
    case 'filled': return '🟢';
    case 'aging': return '🟡';
    case 'stale': return '🔴';
    case 'empty': return '⚫';
  }
}

function staleDaysLabel(block: BlockStatus) {
  if (block.state === 'empty') return 'por preencher';
  if (block.staleDays <= 1) return 'actualizado hoje';
  if (block.staleDays <= 30) return `actualizado há ${block.staleDays} dias`;
  return `desactualizado — ${block.staleDays} dias`;
}

export function ContextOSHub({ data }: ContextOSHubProps) {
  const { blocks, globalScore, emptyCount, totalBlocks } = useContextScore(data);
  const { upsert } = useBusinessContext();
  const { currentWorkspace } = useWorkspace();
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const { data: activeWorkItems = [] } = useAgentWorkItems({ status: "in_progress" });
  const { data: recentHandoffs = [] } = useAgentHandoffs({ status: "pending" });
  const { bots } = useBots();

  const getBotName = (id: string | null) => {
    if (!id) return "—";
    return bots.find((b) => b.id === id)?.name || id.slice(0, 8);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Context OS</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">A memória estratégica do teu negócio</h1>
        <ContextOSExport data={data} blocks={blocks} globalScore={globalScore} workspaceName={currentWorkspace?.name} />
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Context Score global:</span>
            <span className={cn(
              "text-2xl font-bold",
              globalScore >= 80 ? "text-emerald-500" : globalScore >= 50 ? "text-amber-500" : "text-destructive"
            )}>
              {globalScore}%
            </span>
          </div>
          <Progress
            value={globalScore}
            className={cn(
              "h-2.5 w-64",
              globalScore >= 80 ? "[&>div]:bg-emerald-500" : globalScore >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-destructive"
            )}
          />
          <p className="text-xs text-muted-foreground italic">
            "Quanto mais completo, mais inteligente fica o FastCRM."
          </p>
        </div>
      </motion.div>

      {/* Blocks grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {blocks.map((block, i) => (
          <motion.div
            key={block.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "group rounded-xl border bg-card p-4 space-y-3 transition-all hover:shadow-md hover:border-primary/30 cursor-pointer",
              block.state === 'empty' && "border-dashed border-border/60"
            )}
            onClick={() => setEditingBlock(block.key)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{block.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm">{block.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{block.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{stateIcon(block.state)}</span>
                <span className={cn("text-xs font-semibold", stateColor(block.state))}>
                  {block.fillPercent}%
                </span>
              </div>
            </div>
            
            <Progress value={block.fillPercent} className="h-1.5 [&>div]:bg-primary" />
            
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[11px]",
                block.state === 'stale' ? "text-destructive" : "text-muted-foreground"
              )}>
                {staleDaysLabel(block)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {block.state === 'empty' ? (
                  <>Preencher <ArrowRight className="h-3 w-3" /></>
                ) : (
                  <><Pencil className="h-3 w-3" /> Editar</>
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Next Best Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-bold">Próximas Ações Recomendadas</h2>
        </div>
        <NextBestActionsPanel />
      </motion.div>

      {/* Agent Activity Section */}
      {(activeWorkItems.length > 0 || recentHandoffs.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold">Agentes Ativos</h2>
          </div>

          {activeWorkItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Work Items em Progresso</p>
              {activeWorkItems.slice(0, 5).map((wi) => (
                <div key={wi.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                  <Bot className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getBotName(wi.bot_id)}</p>
                    <p className="text-xs text-muted-foreground">{wi.work_type} · {wi.entity_type}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Em progresso</Badge>
                </div>
              ))}
            </div>
          )}

          {recentHandoffs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Handoffs Pendentes</p>
              {recentHandoffs.slice(0, 3).map((h) => (
                <div key={h.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                  <ArrowRightLeft className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {getBotName(h.from_bot_id)} → {h.to_bot_id ? getBotName(h.to_bot_id) : "Humano"}
                    </p>
                    {h.trigger_reason && <p className="text-xs text-muted-foreground truncate">{h.trigger_reason}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(h.created_at), { addSuffix: true, locale: pt })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Block Editor drawer */}
      {editingBlock && (
        <ContextBlockEditor
          blockKey={editingBlock}
          data={data}
          onClose={() => setEditingBlock(null)}
          onSave={(updates) => upsert.mutate(updates)}
        />
      )}
    </div>
  );
}
