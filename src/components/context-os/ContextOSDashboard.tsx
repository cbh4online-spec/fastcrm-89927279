import { useState } from "react";
import { useContextBlocks, useOverallScore, useMissingFields, BLOCK_META, ContextBlock } from "@/hooks/useContextBlocks";
import { ContextScoreRing } from "./ContextScoreRing";
import { ContextBlockDetail } from "./ContextBlockDetail";
import { ContextActionsPanel } from "./ContextActionsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Edit3, Loader2, Database, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ContextOSDashboard() {
  const { data: blocks, isLoading } = useContextBlocks();
  const overallScore = useOverallScore(blocks);
  const missingFields = useMissingFields(blocks);
  const [selectedBlock, setSelectedBlock] = useState<ContextBlock | null>(null);
  const [showActions, setShowActions] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-medium">
            <Database className="h-3 w-3" />
            Context OS
          </div>
          <h2 className="text-xl font-bold text-foreground">Memória Estratégica do Negócio</h2>
          <p className="text-sm text-muted-foreground">
            Documentação viva que alimenta toda a inteligência do sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowActions(!showActions)}
            className="gap-1.5 text-xs border-gold/30 text-gold hover:bg-gold/10"
          >
            <Zap className="h-3.5 w-3.5" />
            {showActions ? "Ver Blocos" : "Context-to-Actions"}
          </Button>
          <ContextScoreRing score={overallScore} size={80} strokeWidth={6} />
        </div>
      </motion.div>

      {/* Actions Panel */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <ContextActionsPanel />
        </motion.div>
      )}

      {!showActions && (
        <>
          {/* Missing Fields Alert */}
          {missingFields.length > 0 && (
            <motion.div
              className="rounded-lg border border-gold/20 bg-gold/5 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-gold" />
                <span className="text-sm font-medium text-gold">Campos por preencher</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {missingFields.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/30 border border-border/50 text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground mr-1">{m.blockLabel}:</span>
                    {m.fieldLabel}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(blocks || []).map((block, idx) => {
              const meta = BLOCK_META[block.block_type];
              return (
                <motion.div
                  key={block.id}
                  className={cn(
                    "group relative rounded-xl border p-5 transition-all cursor-pointer",
                    "bg-card/50 border-border/50",
                    "hover:border-gold/30 hover:bg-card/80 hover:shadow-lg hover:shadow-gold/5"
                  )}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedBlock(block)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{meta.labelPt}</h3>
                        <p className="text-[11px] text-muted-foreground">{meta.label}</p>
                      </div>
                    </div>
                    <Badge
                      variant={block.status === 'approved' ? 'default' : 'secondary'}
                      className={cn(
                        "text-[10px]",
                        block.status === 'approved' && "bg-green-500/10 text-green-500 border-green-500/20"
                      )}
                    >
                      {block.status === 'approved' ? 'Aprovado' : 'Rascunho'}
                    </Badge>
                  </div>

                  {/* Score Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-muted-foreground">Preenchimento</span>
                      <span className="text-[11px] font-medium text-gold">{block.score}%</span>
                    </div>
                    <Progress value={block.score} className="h-1.5 bg-muted/30 [&>div]:bg-gold" />
                  </div>

                  {/* Tags */}
                  {block.tags && block.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {block.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-gold/10 text-[10px] text-gold border border-gold/20">
                          {tag}
                        </span>
                      ))}
                      {block.tags.length > 3 && (
                        <span className="px-2 py-0.5 rounded-full bg-muted/30 text-[10px] text-muted-foreground">
                          +{block.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Fields count */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {(block.fields || []).filter(f => f.field_value !== null && f.field_value !== undefined).length}/{(block.fields || []).length} campos
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1 text-gold hover:text-gold hover:bg-gold/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit3 className="h-3 w-3" /> Editar
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Block Detail Dialog */}
      {selectedBlock && (
        <ContextBlockDetail
          block={selectedBlock}
          open={!!selectedBlock}
          onOpenChange={(open) => !open && setSelectedBlock(null)}
        />
      )}
    </div>
  );
}
