import { useState } from "react";
import { Check, X, Trash2, ChevronDown, ChevronUp, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EntityMemory } from "@/types/agentMemory";
import { 
  getMemoryTypeLabel, 
  getMemoryTypeColor, 
  getCategoryLabel,
  formatMemoryAge 
} from "@/types/agentMemory";

interface MemoryInsightCardProps {
  memory: EntityMemory;
  onValidate?: (isValid: boolean) => void;
  onDelete?: () => void;
  showDetails?: boolean;
}

export function MemoryInsightCard({ 
  memory, 
  onValidate, 
  onDelete,
  showDetails = false 
}: MemoryInsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);

  const relevancePercent = Math.round(memory.relevanceScore * 100);
  const typeLabel = getMemoryTypeLabel(memory.memoryType);
  const typeColor = getMemoryTypeColor(memory.memoryType);
  const categoryLabel = getCategoryLabel(memory.memoryCategory);
  const ageLabel = formatMemoryAge(memory.createdAt);

  return (
    <div className={`
      border rounded-lg p-3 transition-colors
      ${memory.isValidated ? 'border-green-200 bg-green-50/50' : 'hover:bg-muted/50'}
    `}>
      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="secondary" className={`text-xs ${typeColor}`}>
              {typeLabel}
            </Badge>
            {memory.isValidated && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Validado
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Esta memória foi validada por um utilizador</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {ageLabel}
            </span>
          </div>
          
          <p className="text-sm leading-relaxed">
            {memory.content}
          </p>

          {/* Expandable details */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 mt-1 text-xs text-muted-foreground">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Menos detalhes
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Mais detalhes
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-4">
                  <span>Categoria: <strong>{categoryLabel}</strong></span>
                  <span>Relevância: <strong>{relevancePercent}%</strong></span>
                  <span>Versão: <strong>{memory.version}</strong></span>
                </div>
                {memory.accessCount > 0 && (
                  <div>
                    Acedida {memory.accessCount} {memory.accessCount === 1 ? 'vez' : 'vezes'}
                    {memory.lastAccessedAt && ` • Última: ${formatMemoryAge(memory.lastAccessedAt)}`}
                  </div>
                )}
                {memory.sourceExecutionId && (
                  <div>
                    Fonte: Execução de agente
                  </div>
                )}
                {memory.expiresAt && (
                  <div>
                    Expira: {new Date(memory.expiresAt).toLocaleDateString('pt-PT')}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!memory.isValidated && onValidate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                    onClick={() => onValidate(true)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Validar esta memória</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {memory.isValidated && onValidate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                    onClick={() => onValidate(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remover validação</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remover memória</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
