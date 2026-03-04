import { useState } from "react";
import { useAIGenerateActions, ContextAction } from "@/hooks/useContextAI";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BLOCK_META, ContextBlockType } from "@/hooks/useContextBlocks";
import { Zap, Loader2, Target, AlertTriangle, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_CONFIG = {
  gap: { icon: AlertTriangle, label: "Gap", color: "text-red-500 bg-red-500/10 border-red-500/20" },
  goal: { icon: Target, label: "Meta", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  process: { icon: Settings, label: "Processo", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  opportunity: { icon: TrendingUp, label: "Oportunidade", color: "text-green-500 bg-green-500/10 border-green-500/20" },
};

const PRIORITY_COLORS = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-muted/30 text-muted-foreground border-border/50",
};

export function ContextActionsPanel() {
  const { currentWorkspace } = useWorkspace();
  const generateActions = useAIGenerateActions();
  const [actions, setActions] = useState<ContextAction[]>([]);

  const handleGenerate = () => {
    if (!currentWorkspace?.id) return;
    generateActions.mutate(
      { workspaceId: currentWorkspace.id },
      { onSuccess: (data) => setActions(data) }
    );
  };

  return (
    <div className="space-y-4">
      {actions.length === 0 && (
        <div className="text-center space-y-3 py-6">
          <Zap className="h-8 w-8 mx-auto text-gold/50" />
          <div>
            <h3 className="text-sm font-medium text-foreground">Context-to-Actions</h3>
            <p className="text-xs text-muted-foreground mt-1">
              A IA analisa todo o contexto estratégico e gera ações prioritárias
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generateActions.isPending}
            className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground"
          >
            {generateActions.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Gerar Ações
          </Button>
        </div>
      )}

      {actions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-gold" />
              <span className="text-sm font-medium text-foreground">
                {actions.length} Ações Recomendadas
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generateActions.isPending}
              className="text-xs gap-1"
            >
              {generateActions.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              Regenerar
            </Button>
          </div>

          {actions.map((a, idx) => {
            const cat = CATEGORY_CONFIG[a.category] || CATEGORY_CONFIG.gap;
            const CatIcon = cat.icon;
            const blockMeta = BLOCK_META[a.source_block as ContextBlockType];

            return (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border p-3 space-y-2",
                  "border-border/50 bg-muted/10 hover:border-gold/20 transition-colors"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-6 w-6 rounded flex items-center justify-center flex-shrink-0", cat.color)}>
                      <CatIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{a.title}</span>
                  </div>
                  <Badge variant="secondary" className={cn("text-[10px] flex-shrink-0", PRIORITY_COLORS[a.priority])}>
                    {a.priority === 'high' ? 'Alta' : a.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{a.description}</p>
                <div className="flex items-center gap-2">
                  {blockMeta && (
                    <span className="text-[10px] text-gold/70">
                      {blockMeta.icon} {blockMeta.labelPt}
                    </span>
                  )}
                  <Badge variant="secondary" className={cn("text-[9px]", cat.color)}>
                    {cat.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
